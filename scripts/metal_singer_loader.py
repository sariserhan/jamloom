"""Direct Metal placement for the hash-verified, unquantized local singer model."""
from pathlib import Path


def load_metal_dit(handler, *, model_checkpoint_path, device, use_flash_attention,
                   compile_model, quantization):
    import torch
    from transformers import AutoModel

    if (device != 'mps' or not torch.backends.mps.is_available() or compile_model
            or quantization or use_flash_attention or handler.offload_dit_to_cpu):
        raise ValueError('Direct Metal loading requires the uncompiled, unquantized SDPA model')
    checkpoint = Path(model_checkpoint_path)
    if not checkpoint.is_dir() or not (checkpoint/'silence_latent.pt').is_file():
        raise ValueError('Verified local model and silence latent are required')
    # Device placement during loading avoids retaining a full CPU model while
    # copying it to MPS. Keep the same BF16 weights and attention implementation.
    handler.dtype = torch.bfloat16
    handler.model = AutoModel.from_pretrained(
        str(checkpoint), trust_remote_code=True, local_files_only=True,
        attn_implementation='sdpa', dtype=handler.dtype, device_map='mps',
        low_cpu_mem_usage=True,
    )
    # Transformers leaves nonpersistent rotary buffers in FP32. The original
    # loader casts these too; preserve that contract without another device copy.
    handler.model = handler.model.to(dtype=handler.dtype)
    if any(p.device.type != 'mps' or p.dtype != handler.dtype for p in handler.model.parameters()):
        raise RuntimeError('Direct Metal model placement or precision changed')
    handler.model.config._attn_implementation = 'sdpa'
    handler.config = handler.model.config
    handler._sync_alignment_config()
    handler.model.eval()
    handler.silence_latent = torch.load(
        checkpoint/'silence_latent.pt', map_location='cpu', weights_only=True,
    ).transpose(1, 2).to(device=device, dtype=handler.dtype)
    return 'sdpa'
