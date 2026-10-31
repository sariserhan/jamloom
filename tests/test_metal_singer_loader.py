"""Tiny, original offline weights exercise actual Metal loading and exact weight identity."""
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from metal_singer_loader import load_metal_dit


class DirectMetalLoading(unittest.TestCase):
    def test_actual_safetensors_weights_and_latent_match_without_cpu_model_copy(self):
        import torch
        from transformers import Qwen3Config, Qwen3Model
        if not torch.backends.mps.is_available():
            self.skipTest('Actual Metal hardware required')
        with tempfile.TemporaryDirectory() as folder:
            torch.manual_seed(17)
            model = Qwen3Model(Qwen3Config(vocab_size=32, hidden_size=16, intermediate_size=32,
                num_hidden_layers=1, num_attention_heads=2, num_key_value_heads=2, head_dim=8)).to(torch.bfloat16).eval()
            model.save_pretrained(folder, safe_serialization=True)
            latent = torch.arange(24, dtype=torch.float32).reshape(1, 4, 6)
            torch.save(latent, Path(folder)/'silence_latent.pt')
            synced=[]
            handler = SimpleNamespace(offload_dit_to_cpu=False, _sync_alignment_config=lambda:synced.append(True))
            arguments=dict(model_checkpoint_path=folder, device='mps', use_flash_attention=False,
                compile_model=False, quantization=None)
            self.assertEqual(load_metal_dit(handler, **arguments), 'sdpa')
            self.assertEqual(synced, [True])
            self.assertFalse(handler.model.training)
            for name, original in model.state_dict().items():
                actual=handler.model.state_dict()[name]
                self.assertEqual(actual.device.type,'mps')
                self.assertTrue(torch.equal(original,actual.cpu()),name)
            for name,original in model.named_buffers():
                actual=dict(handler.model.named_buffers())[name]
                self.assertEqual(original.dtype,actual.dtype,name)
                self.assertTrue(torch.equal(original,actual.cpu()),name)
            self.assertTrue(torch.equal(handler.silence_latent.cpu(),latent.transpose(1,2).to(torch.bfloat16)))
            for override in ({'device':'cpu'},{'compile_model':True},{'quantization':'int8'},{'use_flash_attention':True}):
                with self.assertRaises(ValueError):load_metal_dit(handler, **(arguments|override))
            del handler, model
            torch.mps.empty_cache()


if __name__=='__main__':unittest.main()
