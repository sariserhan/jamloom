"""Direct Metal placement for the hash-verified, unquantized local singer model."""
from pathlib import Path


def load_metal_text(handler, *, checkpoint_dir, device):
    """Load the same text weights directly at their inference precision."""
    import torch
    from transformers import AutoModel,AutoTokenizer
    if device!='mps' or handler.dtype!=torch.bfloat16:
        raise ValueError('Text placement requires the BF16 Metal singer')
    checkpoint=Path(checkpoint_dir)/'Qwen3-Embedding-0.6B'
    if not checkpoint.is_dir():raise ValueError('Verified text encoder is required')
    handler.text_tokenizer=AutoTokenizer.from_pretrained(str(checkpoint),local_files_only=True)
    handler.text_encoder=AutoModel.from_pretrained(str(checkpoint),local_files_only=True,
        dtype=handler.dtype,device_map='mps',low_cpu_mem_usage=True).to(dtype=handler.dtype).eval()
    if any(p.device.type!='mps' or p.dtype!=handler.dtype for p in handler.text_encoder.parameters()):
        raise RuntimeError('Text encoder device or precision changed')
    return str(checkpoint)


def release_generation_models(handler):
    """Release finished generation weights before a single-use Metal decode.

    Only call after diffusion has returned its latents. The VAE and generated
    latents remain live; this handler deliberately cannot generate another song.
    """
    import gc
    import torch
    if str(handler.device) != 'mps' or handler.model is None:
        raise ValueError('Release requires a completed, single-use Metal generator')
    torch.mps.synchronize()
    before=torch.mps.current_allocated_memory()
    handler.model=None
    handler.text_encoder=None
    gc.collect()
    torch.mps.empty_cache()
    handler.released_generation_bytes=max(0,before-torch.mps.current_allocated_memory())


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
