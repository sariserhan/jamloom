"""Tiny, original offline weights exercise actual Metal loading and exact weight identity."""
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from metal_singer_loader import load_metal_dit,load_metal_text,release_generation_models


class DirectMetalLoading(unittest.TestCase):
    def test_text_encoder_preserves_weights_and_inference_precision(self):
        import torch
        from transformers import Qwen3Config,Qwen3Model
        if not torch.backends.mps.is_available():self.skipTest('Actual Metal hardware required')
        with tempfile.TemporaryDirectory() as folder:
            checkpoint=Path(folder)/'Qwen3-Embedding-0.6B'
            original=Qwen3Model(Qwen3Config(vocab_size=32,hidden_size=16,intermediate_size=32,
                num_hidden_layers=1,num_attention_heads=2,num_key_value_heads=2,head_dim=8)).eval()
            original.save_pretrained(checkpoint,safe_serialization=True)
            handler=SimpleNamespace(dtype=torch.bfloat16)
            with patch('transformers.AutoTokenizer.from_pretrained',return_value='fixture tokenizer'):
                load_metal_text(handler,checkpoint_dir=folder,device='mps')
            expected=original.to('mps').to(torch.bfloat16)
            for name,param in expected.state_dict().items():
                self.assertTrue(torch.equal(handler.text_encoder.state_dict()[name],param),name)
            inputs=torch.tensor([[1,2,3]],device='mps')
            with torch.inference_mode():
                self.assertTrue(torch.equal(expected(inputs).last_hidden_state,handler.text_encoder(inputs).last_hidden_state))
            del handler,original,expected
            torch.mps.empty_cache()

    def test_single_use_release_keeps_latents_and_vae_unchanged(self):
        import torch
        if not torch.backends.mps.is_available():self.skipTest('Actual Metal hardware required')
        handler=SimpleNamespace(device='mps',model=torch.ones(1024*1024,device='mps'),
            text_encoder=torch.ones(1024,device='mps'),vae=torch.arange(8,device='mps'))
        latents=torch.arange(12,device='mps');expected=latents.cpu();vae=handler.vae.cpu()
        release_generation_models(handler)
        self.assertIsNone(handler.model);self.assertIsNone(handler.text_encoder)
        self.assertGreaterEqual(handler.released_generation_bytes,4*1024**2)
        self.assertTrue(torch.equal(latents.cpu(),expected));self.assertTrue(torch.equal(handler.vae.cpu(),vae))
        with self.assertRaises(ValueError):release_generation_models(handler)

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
