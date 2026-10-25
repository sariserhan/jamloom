import XCTest
import AVFoundation
@testable import Jamloom

@MainActor final class MobileAudioTests: XCTestCase {
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
