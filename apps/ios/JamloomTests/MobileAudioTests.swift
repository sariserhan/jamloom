import XCTest
import AVFoundation
@testable import Jamloom

@MainActor final class MobileAudioTests: XCTestCase {
    nonisolated func testPhysicalMicrophoneAndReportedRouteTimingWhenRequested() async throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Requires the owner's physical iPhone")
        #else
        try XCTSkipUnless(ProcessInfo.processInfo.environment["JAMLOOM_HARDWARE_AUDIO"] == "1",
                          "Opt-in physical microphone check; audio is never saved")
        let granted = await AVAudioApplication.requestRecordPermission()
        try XCTSkipUnless(granted, "The owner must allow microphone access on the phone")
        let session = AVAudioSession.sharedInstance()
        let category = session.category, mode = session.mode, options = session.categoryOptions
        let preferredRate = session.preferredSampleRate, preferredBuffer = session.preferredIOBufferDuration
        defer {
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            try? session.setCategory(category, mode: mode, options: options)
            try? session.setPreferredSampleRate(preferredRate)
            try? session.setPreferredIOBufferDuration(preferredBuffer)
        }
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
        try session.setPreferredSampleRate(48000)
        try session.setPreferredIOBufferDuration(512.0 / 48000)
        try session.setActive(true)
        let engine = AVAudioEngine(), statistics = PhysicalInputStatistics()
        let input = engine.inputNode, format = input.outputFormat(forBus: 0)
        XCTAssertGreaterThan(format.sampleRate, 0)
        XCTAssertGreaterThan(format.channelCount, 0)
        input.installTap(onBus: 0, bufferSize: 512, format: format) { buffer, _ in
            statistics.observe(buffer)
        }
        defer { engine.stop(); input.removeTap(onBus: 0) }
        try engine.start()
        try await Task.sleep(for: .seconds(5))
        engine.stop()
        let measured = statistics.snapshot()
        XCTAssertGreaterThan(measured.frames, Int(format.sampleRate * 2))
        XCTAssertGreaterThan(measured.buffers, 1)
        XCTAssertEqual(measured.nonfinite, 0)
        let report: [String: Any] = [
            "scope": "Real input buffers and driver-reported timing; not acoustic round-trip latency",
            "sampleRate": format.sampleRate, "channels": format.channelCount,
            "frames": measured.frames, "buffers": measured.buffers, "nonfiniteSamples": measured.nonfinite,
            "inputLatencySeconds": session.inputLatency, "outputLatencySeconds": session.outputLatency,
            "ioBufferDurationSeconds": session.ioBufferDuration,
            "inputs": session.currentRoute.inputs.map { $0.portType.rawValue },
            "outputs": session.currentRoute.outputs.map { $0.portType.rawValue },
            "audioSaved": false, "audioUploaded": false
        ]
        let data = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        attachment.name = "physical-microphone-route-timing"; attachment.lifetime = .keepAlways; add(attachment)
        #endif
    }
    func testPlaybackPausesSeeksClampsAndResumes() async throws {
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("player-test-\(UUID()).wav")
        try CloudRecording.wav(AudioInput(samples: Array(repeating: 0, count: 480000), rate: 48000), start: 0, end: 10).write(to: file)
        let model = AppModel()
        defer { model.stopPlayback(); try? FileManager.default.removeItem(at: file) }
        await model.play(file, title: "Test music")
        XCTAssertEqual(model.playing, file); XCTAssertEqual(model.playbackTitle, "Test music")
        model.togglePlayback(); XCTAssertTrue(model.playbackPaused)
        model.seekPlayback(to: 4); XCTAssertEqual(model.playbackPosition, 4)
        model.seekPlayback(to: .nan); XCTAssertEqual(model.playbackPosition, 4)
        model.seekPlayback(to: -15); XCTAssertEqual(model.playbackPosition, 0)
        model.seekPlayback(to: 30); XCTAssertEqual(model.playbackPosition, 10)
        model.seekPlayback(to: 4); model.togglePlayback(); XCTAssertFalse(model.playbackPaused)
        try await Task.sleep(for: .milliseconds(400))
        XCTAssertGreaterThan(model.playbackPosition, 4); XCTAssertLessThan(model.playbackPosition, 5)
        model.stopPlayback(); XCTAssertNil(model.playing); XCTAssertEqual(model.playbackPosition, 0)
    }
    func testCloudRecordingProducesBoundedMono16kPCMAndRejectsInvalidTrim() throws {
        let input = AudioInput(samples: (0..<96000).map { Float(sin(Double($0) * 2 * .pi * 440 / 48000) * 0.1) }, rate: 48000)
        let data = try CloudRecording.wav(input, start: 0.25, end: 1.75)
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("cloud-test-\(UUID()).wav")
        defer { try? FileManager.default.removeItem(at: file) }
        try data.write(to: file)
        let audio = try AVAudioFile(forReading: file)
        XCTAssertEqual(audio.processingFormat.sampleRate, 16000)
        XCTAssertEqual(audio.processingFormat.channelCount, 1)
        XCTAssertEqual(Double(audio.length) / 16000, 1.5, accuracy: 0.005)
        XCTAssertEqual(data.count, 44 + Int(audio.length) * 2)
        XCTAssertThrowsError(try CloudRecording.wav(input, start: -1, end: 1))
        XCTAssertThrowsError(try CloudRecording.wav(input, start: 0, end: 3))
        XCTAssertThrowsError(try CloudRecording.wav(input, start: .nan, end: 1))
    }
}

private final class PhysicalInputStatistics: @unchecked Sendable {
    private let lock = NSLock()
    private var frames = 0, buffers = 0, nonfinite = 0
    func observe(_ buffer: AVAudioPCMBuffer) {
        let count = Int(buffer.frameLength)
        var invalid = 0
        if let channels = buffer.floatChannelData {
            for channel in 0..<Int(buffer.format.channelCount) {
                for index in 0..<count where !channels[channel][index * Int(buffer.stride)].isFinite { invalid += 1 }
            }
        } else { invalid = count }
        lock.lock(); frames += count; buffers += 1; nonfinite += invalid; lock.unlock()
    }
    func snapshot() -> (frames: Int, buffers: Int, nonfinite: Int) {
        lock.lock(); defer { lock.unlock() }
        return (frames, buffers, nonfinite)
    }
}
