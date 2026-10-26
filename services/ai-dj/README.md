# AI DJ cached worker candidate

Status: prepared, not built or GPU-qualified. No image is selected by a rental controller.

The manual `Build AI DJ worker` workflow builds Linux/amd64, verifies packaged
source hashes and imports the CLI without networking, and records image size.
Publishing defaults to false. The optional `music_planner` build includes the
pinned 1.7B semantic model; it does not enable that model in normal serving.
The separate base-model comparison is a source-bootstrap research mode; its
base weights and study module are not packaged in this serving-image candidate.
Neither workflow choice rents hardware, changes website settings or starts a
renderer. A workflow run can consume repository Actions allowance; do not treat
it as a free/unbounded build service.

The image contains only explicitly listed worker sources, the style manifest,
pinned upstream runtime and public model components. It excludes local env
files, credentials, recordings and reference audio. Upstream code license and
model card are retained. No voice conversion or reference-derived adapter is
included. Normalization, short-vocal and timing checks remain unchanged.

The container starts idle. An operator must supply a mode-0600 renderer-token
file, an absolute approved deadline and maximum request count, then run
`dj_warm_engine.py` from `/opt/jamloom/ace-step`. The CLI enforces at most 40
minutes and 100 audio calls; neither this image nor its supervisor renews those
bounds. `/health` and `/render` bind only to loopback and require the token.
Use the existing authenticated SSH tunnel, not a public renderer port.

Before admitting an image to the rental controller:

1. Record the immutable repository digest, build revision, size and worker hashes.
2. Qualify the provider's SSH startup path and CUDA driver compatibility on an
   explicitly approved rental with its independent watchdog already armed.
3. Verify offline model startup, authenticated health, exact request replay,
   actual audio and a deadline failure, then confirm complete provider inventory
   is empty. Count image transfer/startup/idle/failure costs.
4. Qualify musical quality separately. A successful image build or faster cold
   start is not permission to enable an unaccepted generation method.

Vast SSH launch mode replaces the image startup command with its setup scripts;
the image's idle CMD is not a provider shutdown mechanism. See the
[provider container documentation](https://github.com/vast-ai/docs/blob/main/guides/instances/docker-environment.mdx).
The hosted cleanup route remains disabled until the reviewed target, secret,
budget and provider configuration are present; it only reconciles registered
rentals. See [completion gates](../../docs/ai-dj-finish-campaign.md).
