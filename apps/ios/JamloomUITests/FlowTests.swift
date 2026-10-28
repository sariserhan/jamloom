import XCTest

final class FlowTests: XCTestCase {
    func testCommunityRatingExplainsSignInAndDismisses() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture"]
        app.launch(); app.buttons["Community"].firstMatch.tap()
        let help = app.buttons["How to use Community"]
        XCTAssertTrue(help.waitForExistence(timeout: 10)); help.tap()
        XCTAssertTrue(app.staticTexts["How to use it"].waitForExistence(timeout: 5)); let guide = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); guide.name = "Community product guide"; guide.lifetime = .keepAlways; add(guide); app.buttons["Close"].tap()
        let rate = app.buttons["Rate"].firstMatch
        XCTAssertTrue(rate.waitForExistence(timeout: 15)); XCTAssertTrue(rate.isHittable); rate.tap()
        XCTAssertTrue(app.navigationBars["Your feedback"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Sign in through Account to rate this music."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Like"].isEnabled); app.buttons["Like"].tap()
        XCTAssertTrue(app.buttons["Sign in to save a rating"].exists)
        XCTAssertTrue(app.buttons["Save rating"].isEnabled)
        XCTAssertFalse(app.staticTexts["Help improve Jamloom"].exists)
        app.buttons["Save rating"].tap()
        XCTAssertTrue(app.navigationBars["Jamloom account"].waitForExistence(timeout: 5))
        app.navigationBars["Jamloom account"].buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Like"].isSelected)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Music feedback sign-in"; image.lifetime = .keepAlways; add(image)
        app.buttons["Done"].tap(); XCTAssertTrue(rate.waitForExistence(timeout: 5)); rate.tap()
        XCTAssertTrue(app.navigationBars["Your feedback"].waitForExistence(timeout: 5)); app.buttons["Done"].tap()
    }

    func testCommunityRatingSignsInSavesAndReopens() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture", "--rating-fixture"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Community"].firstMatch.tap()
        let rate = app.buttons["Rate"].firstMatch; XCTAssertTrue(rate.waitForExistence(timeout: 15)); rate.tap()
        XCTAssertTrue(app.buttons["Like"].waitForExistence(timeout: 5)); app.buttons["Like"].tap(); app.buttons["Save rating"].tap()
        XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: 5)); app.textFields["Email"].tap(); app.textFields["Email"].typeText("listener@example.test")
        app.secureTextFields["Password"].tap(); app.secureTextFields["Password"].typeText("fixture-only")
        app.buttons["Sign in"].tap()
        XCTAssertTrue(app.buttons["Like"].waitForExistence(timeout: 10)); XCTAssertTrue(app.buttons["Like"].isSelected)
        let save = app.buttons["Save rating"]; XCTAssertTrue(save.isEnabled); save.tap()
        XCTAssertTrue(app.staticTexts["Rating saved."].waitForExistence(timeout: 10)); app.buttons["Done"].tap()
        rate.tap(); XCTAssertTrue(app.buttons["Like"].waitForExistence(timeout: 5)); XCTAssertTrue(app.buttons["Like"].isSelected)
        XCTAssertFalse(app.staticTexts["Help improve Jamloom"].exists)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Saved Community rating"; image.lifetime = .keepAlways; add(image)
        app.buttons["Needs work"].tap(); save.tap(); XCTAssertTrue(app.staticTexts["Rating saved."].waitForExistence(timeout: 10))
        app.buttons["Done"].tap(); rate.tap(); XCTAssertTrue(app.buttons["Needs work"].waitForExistence(timeout: 5)); XCTAssertTrue(app.buttons["Needs work"].isSelected)
    }

    func testCommunityBottomPlayerPausesSeeksAndKeepsPlayingWhileBrowsing() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture", "--community-player"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); tapVisible(app.tabBars.buttons["Community"], in: app)
        let song = app.buttons["Play Night lights"]; XCTAssertTrue(song.waitForExistence(timeout: 15)); song.tap()
        let toggle = app.buttons["playbackToggle"], found = app.buttons["playbackToggle"].waitForExistence(timeout: 10)
        if !found { let tree = XCTAttachment(string: app.debugDescription); tree.name = "Missing playback control"; tree.lifetime = .keepAlways; add(tree) }
        XCTAssertTrue(found); XCTAssertEqual(toggle.label, "Pause"); toggle.tap(); XCTAssertEqual(toggle.label, "Play")
        let slider = app.sliders["Playback position"]; XCTAssertTrue(slider.isHittable); slider.adjust(toNormalizedSliderPosition: 0.5)
        let middle = app.staticTexts["playbackTime"].label; XCTAssertFalse(middle.hasPrefix("0:00"))
        app.buttons["Rewind 15 seconds"].tap(); XCTAssertTrue(app.staticTexts["playbackTime"].label.hasPrefix("0:00"))
        app.buttons["Forward 15 seconds"].tap(); XCTAssertTrue(app.staticTexts["playbackTime"].label.hasPrefix("0:15"))
        slider.adjust(toNormalizedSliderPosition: 0.3)
        app.buttons["communityLanguage"].tap(); app.buttons["English"].tap()
        XCTAssertTrue(toggle.waitForExistence(timeout: 10)); XCTAssertEqual(toggle.label, "Play")
        app.buttons["Favorite Night lights"].tap(); app.buttons["collection-Favorites"].tap()
        XCTAssertTrue(app.buttons["Unfavorite Night lights"].waitForExistence(timeout: 10)); XCTAssertTrue(toggle.exists); XCTAssertEqual(toggle.label, "Play")
        toggle.tap(); XCTAssertEqual(toggle.label, "Pause")
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Community bottom music player"; image.lifetime = .keepAlways; add(image)
        app.buttons["Close music player"].tap(); XCTAssertFalse(toggle.exists)
        app.buttons["collection-All songs"].tap()
        app.buttons["communityLanguage"].tap(); app.buttons["All languages"].tap()
        let set = app.buttons["Play Rooftop party"]; XCTAssertTrue(set.waitForExistence(timeout: 15)); set.tap()
        let webPause = app.webViews.buttons["Pause"]; XCTAssertTrue(webPause.waitForExistence(timeout: 10)); webPause.tap()
        XCTAssertTrue(app.webViews.buttons["Play"].exists); XCTAssertTrue(app.webViews.sliders["Playback position"].exists)
        app.webViews.buttons["Rewind 15 seconds"].tap()
        let streamImage = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); streamImage.name = "Community bottom set player"; streamImage.lifetime = .keepAlways; add(streamImage)
        app.buttons["Close music player"].tap(); XCTAssertFalse(app.webViews.sliders["Playback position"].exists)
    }
    func testCommunityLanguageFilterAndFavorites() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture", "--community-languages"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); tapVisible(app.tabBars.buttons["Community"], in: app)
        XCTAssertTrue(app.buttons["Play Night lights"].waitForExistence(timeout: 15))
        let language = app.buttons["communityLanguage"]
        language.tap(); app.buttons["Turkish"].tap()
        XCTAssertTrue(app.buttons["Play Gece ritmi"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Play Night lights"].exists)
        app.buttons["Favorite Gece ritmi"].tap(); app.buttons["collection-Favorites"].tap()
        XCTAssertTrue(app.buttons["Play Gece ritmi"].waitForExistence(timeout: 10))
        language.tap(); app.buttons["All languages"].tap()
        XCTAssertTrue(app.buttons["Play Gece ritmi"].waitForExistence(timeout: 10))
        app.buttons["collection-All songs"].tap()
        XCTAssertTrue(app.buttons["Play Night lights"].waitForExistence(timeout: 15))
        language.tap(); app.buttons["English"].tap()
        XCTAssertTrue(app.buttons["Play Night lights"].waitForExistence(timeout: 15)); XCTAssertFalse(app.buttons["Play Gece ritmi"].exists)
        app.buttons["collection-Favorites"].tap()
        XCTAssertTrue(app.staticTexts["No matching songs"].waitForExistence(timeout: 10))
        app.buttons["Clear filters"].tap(); XCTAssertTrue(app.buttons["Play Gece ritmi"].waitForExistence(timeout: 10))
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Community language filter"; image.lifetime = .keepAlways; add(image)
    }
    func testCommunityFavoritesAndPlayback() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Community"].firstMatch.tap()
        let play = app.buttons["Play Night lights"]
        XCTAssertTrue(play.waitForExistence(timeout: 15)); XCTAssertTrue(play.isHittable)
        app.buttons["Favorite Night lights"].tap()
        app.buttons["collection-Favorites"].tap()
        XCTAssertTrue(app.buttons["Unfavorite Night lights"].waitForExistence(timeout: 5))
        play.tap(); XCTAssertTrue(app.buttons["Stop Night lights"].waitForExistence(timeout: 10))
        app.terminate(); app.launch(); app.buttons["Community"].firstMatch.tap()
        XCTAssertTrue(app.buttons["collection-Favorites"].waitForExistence(timeout: 10)); app.buttons["collection-Favorites"].tap()
        XCTAssertTrue(app.buttons["Unfavorite Night lights"].waitForExistence(timeout: 5))
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Community favorites"; image.lifetime = .keepAlways; add(image)
        app.buttons["Unfavorite Night lights"].tap(); XCTAssertTrue(app.staticTexts["Your favorites"].waitForExistence(timeout: 5))
    }
    func testCommunityPublicOutageDoesNotAskForOwnerSignIn() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing", "--community-fixture", "--community-gated"]
        app.launch(); app.buttons["Community"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Public songs are temporarily unavailable. Please try again later."].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Sign in"].exists)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Community public service unavailable"; image.lifetime = .keepAlways; add(image)
    }
    override func setUpWithError() throws { continueAfterFailure = false }
    override func tearDownWithError() throws {
        if let run = testRun, run.failureCount > 0 {
            let app = XCUIApplication()
            let tree = XCTAttachment(string: app.debugDescription); tree.name = "Failed app hierarchy"; tree.lifetime = .keepAlways; add(tree)
            let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Failed app screen"; screenshot.lifetime = .keepAlways; add(screenshot)
        }
    }
    // Use visible tab bounds when the accessibility snapshot has no valid hit point.
    private func tapVisible(_ element: XCUIElement, in app: XCUIApplication) {
        XCTAssertTrue(element.waitForExistence(timeout: 10))
        XCTAssertFalse(element.frame.isEmpty)
        XCTAssertTrue(app.frame.contains(element.frame))
        element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
    private func waitUntilEnabled(_ element: XCUIElement) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 30), .completed)
    }
    private func editFavoriteNames(_ app: XCUIApplication) -> XCUIElement {
        let edit = app.buttons["Edit names manually"]
        for _ in 0..<6 { if edit.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(edit.waitForExistence(timeout: 15)); waitUntilEnabled(edit); edit.tap()
        return app.textViews["Favourite tracks and artists"]
    }
    private func loadPracticeDecks(_ app: XCUIApplication) {
        let music = app.webViews.buttons["Music"]
        XCTAssertTrue(music.waitForExistence(timeout: 20)); music.tap()
        for letter in ["A", "B"] {
            let load = app.webViews.buttons["Load into \(letter)"]
            let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: load)
            XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 20), .completed)
            load.tap()
            Thread.sleep(forTimeInterval: 2)
        }
        app.webViews.buttons["Done"].tap()
    }
    func testLandscapeDeckControlsFitWithoutScrolling() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch(); app.buttons["DJ Deck"].firstMatch.tap()
        let help = app.webViews.descendants(matching: .any)["How to use DJ Studio"].firstMatch
        XCTAssertTrue(help.waitForExistence(timeout: 15)); XCTAssertTrue(help.isHittable); help.tap()
        XCTAssertTrue(app.webViews.staticTexts["What it does"].waitForExistence(timeout: 5)); app.webViews.buttons["Close ×"].tap()
        loadPracticeDecks(app)
        for name in ["Play A", "Play B", "Cue", "Stop"] {
            let control = app.webViews.buttons[name].firstMatch
            XCTAssertTrue(control.isHittable, name)
            XCTAssertTrue(app.frame.contains(control.frame), "Clipped: \(name) \(control.frame)")
        }
        let pads = app.webViews.descendants(matching: .any)["Performance pads and effects"].firstMatch
        XCTAssertTrue(pads.isHittable)
        XCTAssertTrue(app.frame.contains(pads.frame))
        let crossfade = app.webViews.sliders["Crossfader"]
        XCTAssertTrue(crossfade.isHittable)
        XCTAssertTrue(app.frame.contains(crossfade.frame))
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); screenshot.name = "Professional landscape console"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    func testDeckRotationRetainsTracksAndStopsOnTabChange() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch(); app.buttons["DJ Deck"].firstMatch.tap()
        loadPracticeDecks(app)
        let play = app.webViews.buttons["Play A"]
        XCTAssertTrue(play.isEnabled); play.tap()
        XCTAssertTrue(app.webViews.buttons["Pause A"].waitForExistence(timeout: 10))
        app.buttons["Improvise"].firstMatch.tap(); app.buttons["DJ Deck"].firstMatch.tap()
        XCTAssertTrue(play.waitForExistence(timeout: 10)); XCTAssertTrue(play.isEnabled)
        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 1)
        XCTAssertTrue(app.webViews.buttons["Play B"].exists)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Professional portrait console"; image.lifetime = .keepAlways; add(image)
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 1)
        XCTAssertTrue(play.isHittable); XCTAssertTrue(play.isEnabled)
    }
    func testCloudCreationRequiresSeparateConsentAndSignIn() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 10)); waitUntilEnabled(consent); consent.tap()
        let consented = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == '1'"), object: consent)
        XCTAssertEqual(XCTWaiter.wait(for: [consented], timeout: 5), .completed)
        app.buttons["Load test clip"].tap()
        let cloud = app.buttons["Create a full song"]
        for _ in 0..<6 { if cloud.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(cloud.waitForExistence(timeout: 15)); cloud.tap()
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 10))
        let upload = app.buttons["Upload clip & review price"]
        app.scrollViews.firstMatch.swipeUp()
        XCTAssertTrue(upload.exists); XCTAssertFalse(upload.isEnabled)
        XCTAssertEqual(app.switches["Send this clip for cloud processing"].value as? String, "0")
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Explicit cloud consent"; image.lifetime = .keepAlways; add(image)
    }
    // Live provider check: run explicitly against the published names-only search API.
    func testLiveFavoriteAutocompleteWithoutAnAccount() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let field = app.textFields["dnaSearch"]
        XCTAssertTrue(field.waitForExistence(timeout: 15)); waitUntilEnabled(field)
        field.tap(); field.typeText("Daft Punk")
        let artist = app.buttons["dnaSuggestion-Daft Punk"]
        XCTAssertTrue(artist.waitForExistence(timeout: 30)); XCTAssertEqual(app.alerts.count, 0)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Live account-free artist and song suggestions"; screenshot.lifetime = .keepAlways; add(screenshot)
        artist.tap()
        XCTAssertTrue(NSPredicate(format: "value != %@", "Daft Punk").evaluate(with: field))
        field.tap(); field.typeText("Daft Punk")
        let track = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier CONTAINS %@", "dnaSuggestion-", " — ")).firstMatch
        XCTAssertTrue(track.waitForExistence(timeout: 30)); let reference = String(track.identifier.dropFirst("dnaSuggestion-".count))
        track.tap()
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let favorites = editFavoriteNames(app)
        XCTAssertTrue(favorites.waitForExistence(timeout: 15)); waitUntilEnabled(favorites)
        XCTAssertEqual(favorites.value as? String, "Daft Punk\n\(reference)")
        XCTAssertEqual(app.alerts.count, 0)
    }
    // Live public one-song playlist: run explicitly against the published import API.
    func testLiveYouTubePlaylistImportWithoutAnAccount() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let search = app.textFields["dnaSearch"]
        XCTAssertTrue(search.waitForExistence(timeout: 15)); waitUntilEnabled(search)
        let button = app.buttons["youtubeMusicFavorites"]
        for _ in 0..<6 { if button.isHittable { break }; app.swipeUp() }
        button.tap()
        let field = app.textFields["youtubePlaylistLink"]
        XCTAssertTrue(field.waitForExistence(timeout: 10)); field.tap()
        field.typeText("https://music.youtube.com/playlist?list=OLAK5uy_nwYsan9TcbkjHCOv-tt49-WVSivyoYaoU")
        app.buttons["checkYouTubePlaylist"].tap()
        let addSongs = app.buttons["addYouTubeFavorites"]
        XCTAssertTrue(addSongs.waitForExistence(timeout: 90)); XCTAssertTrue(addSongs.isHittable)
        XCTAssertTrue(app.staticTexts["MATHEMATICS — Jace Davey"].exists)
        XCTAssertEqual(app.alerts.count, 0)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Live YouTube Music matched playlist"; screenshot.lifetime = .keepAlways; add(screenshot)
        addSongs.tap()
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let favorites = editFavoriteNames(app)
        XCTAssertTrue(favorites.waitForExistence(timeout: 15)); waitUntilEnabled(favorites)
        XCTAssertEqual(favorites.value as? String, "MATHEMATICS — Jace Davey")
    }
    func testYouTubeImportRequiresAnExplicitValidPlaylist() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let search = app.textFields["dnaSearch"]
        XCTAssertTrue(search.waitForExistence(timeout: 15)); waitUntilEnabled(search)
        let button = app.buttons["youtubeMusicFavorites"]
        for _ in 0..<6 { if button.isHittable { break }; app.swipeUp() }
        button.tap()
        let field = app.textFields["youtubePlaylistLink"], check = app.buttons["checkYouTubePlaylist"]
        XCTAssertTrue(field.waitForExistence(timeout: 10)); XCTAssertFalse(check.isEnabled)
        XCTAssertFalse(app.staticTexts["youtubeImportStatus"].exists)
        field.tap(); field.typeText("https://example.com/playlist?list=PL1234567890"); check.tap()
        XCTAssertTrue(app.staticTexts["youtubeImportStatus"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["youtubeImportStatus"].label, "Paste a public or unlisted YouTube Music playlist link.")
        XCTAssertFalse(app.buttons["addYouTubeFavorites"].exists); XCTAssertEqual(app.alerts.count, 0)
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "YouTube Music playlist import"; image.lifetime = .keepAlways; add(image)
        app.buttons["Cancel"].tap(); XCTAssertTrue(button.waitForExistence(timeout: 5))
    }
    func testAppleMusicImportPreviewRequiresExplicitConnection() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let search = app.textFields["dnaSearch"]
        XCTAssertTrue(search.waitForExistence(timeout: 15)); waitUntilEnabled(search)
        let button = app.buttons["appleMusicFavorites"]
        for _ in 0..<6 { if button.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(button.exists); waitUntilEnabled(button)
        button.tap()
        XCTAssertTrue(app.buttons["loadAppleFavorites"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["appleFavoritesStatus"].exists)
        XCTAssertFalse(app.buttons["addAppleFavorites"].exists)
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Apple Music explicit import"; image.lifetime = .keepAlways; add(image)
        app.buttons["Cancel"].tap()
        XCTAssertTrue(button.waitForExistence(timeout: 5))
    }
    func testMusicDNACloudConsentKeepsLocalFavoritesAndRequiresSignIn() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let references = editFavoriteNames(app)
        XCTAssertTrue(references.waitForExistence(timeout: 15)); waitUntilEnabled(references)
        for _ in 0..<4 { if references.isHittable { break }; app.swipeUp() }; references.tap(); references.typeText("A favorite song — Artist")
        app.buttons["Done editing"].tap()
        let create = app.buttons["cloudDNA"]
        for _ in 0..<5 { if create.isHittable { break }; app.swipeUp() }
        create.tap()
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.switches["Use these favorites for cloud generation"].value as? String, "0")
        let quote = app.buttons["Review Music DNA price"]
        XCTAssertTrue(quote.exists); XCTAssertFalse(quote.isEnabled)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Native cloud Music DNA"; image.lifetime = .keepAlways; add(image)
        app.buttons["Done"].firstMatch.tap()
        XCTAssertEqual(references.value as? String, "A favorite song — Artist")
    }
    func testTasteTabPersistenceAndDeletion() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let tab = app.buttons["Music DNA"].firstMatch
        XCTAssertTrue(tab.waitForExistence(timeout: 15)); tab.tap()
        let references = editFavoriteNames(app)
        XCTAssertTrue(references.waitForExistence(timeout: 10))
        waitUntilEnabled(references)
        references.tap(); references.typeText("An original tune")
        app.buttons["Done editing"].tap()
        app.swipeUp()
        for _ in 0..<5 {
            if app.buttons["Save preferences on this device"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Save preferences on this device"].tap()
        XCTAssertTrue(app.staticTexts["Saved locally. No audio generated or uploaded."].waitForExistence(timeout: 5))
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        XCTAssertEqual(editFavoriteNames(app).value as? String, "An original tune")
        for _ in 0..<5 {
            if app.buttons["Delete saved profile"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Delete saved profile"].tap()
        XCTAssertTrue(app.staticTexts["Profile deleted."].waitForExistence(timeout: 5))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Music DNA local preferences"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        _ = editFavoriteNames(app)
        XCTAssertTrue(references.waitForExistence(timeout: 10))
        // A real iPhone can expose an empty TextEditor value as nil.
        XCTAssertTrue(references.value == nil || references.value as? String == "")
    }
    func testMusicDNAUsesFavoritesInsteadOfManualDirection() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let create = app.buttons["cloudDNA"]
        XCTAssertTrue(create.waitForExistence(timeout: 15)); XCTAssertFalse(create.isEnabled)
        let practice = app.buttons["Discover practice tracks"]
        for _ in 0..<6 { if practice.isHittable { break }; app.swipeUp() }
        practice.tap()
        let track = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "dnaPractice-")).firstMatch
        XCTAssertTrue(track.waitForExistence(timeout: 10)); let reference = track.label
        track.tap()
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        XCTAssertTrue(create.waitForExistence(timeout: 15)); waitUntilEnabled(create)
        XCTAssertFalse(app.buttons["composeTaste"].exists)
        XCTAssertFalse(app.staticTexts["Your musical direction"].exists)
        XCTAssertFalse(app.steppers.firstMatch.exists)
        let remove = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Remove favorite ")).firstMatch
        XCTAssertTrue(remove.waitForExistence(timeout: 10)); XCTAssertFalse(reference.isEmpty)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Favorites-first Music DNA"; screenshot.lifetime = .keepAlways; add(screenshot)
        remove.tap(); XCTAssertFalse(create.isEnabled)
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        XCTAssertTrue(create.waitForExistence(timeout: 15)); XCTAssertFalse(create.isEnabled)
        XCTAssertFalse(remove.exists)
    }
    func testOptionalAccountKeepsLocalCreationAvailable() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Account"].tap()
        XCTAssertTrue(app.secureTextFields["Password"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Sign in"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Optional account"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["Done"].tap(); XCTAssertTrue(app.buttons["Import"].exists)
        XCTAssertTrue(app.buttons["Improvise"].firstMatch.exists)
        XCTAssertTrue(app.buttons["Music DNA"].firstMatch.exists)
    }
    func testMicrophoneDenialKeepsImportAvailable() {
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .microphone)
        defer { app.resetAuthorizationStatus(for: .microphone) }
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        waitUntilEnabled(consent); consent.tap()
        let consented = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == '1'"), object: consent)
        XCTAssertEqual(XCTWaiter.wait(for: [consented], timeout: 5), .completed)
        app.buttons["Record"].tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let deny = springboard.alerts.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Allow' AND NOT label == 'Allow'")).firstMatch
        XCTAssertTrue(deny.waitForExistence(timeout: 10))
        deny.tap()
        XCTAssertTrue(app.alerts.staticTexts["Microphone access is off. Enable it in Settings, or import a recording."].waitForExistence(timeout: 10))
        app.alerts.buttons["OK"].tap()
        XCTAssertTrue(app.buttons["Import"].isEnabled)
    }
    func testLargeTextConsentAndPrivacy() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        XCTAssertTrue(app.switches["consentToggle"].waitForExistence(timeout: 15))
        for _ in 0..<8 {
            if app.buttons["Privacy & your recordings"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Privacy & your recordings"].tap()
        XCTAssertTrue(app.staticTexts["Your recordings stay here"].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Accessible privacy text"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["Done"].tap()
    }

    func testConsentRenderPlaybackSaveAndRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Load test clip"].isEnabled)
        waitUntilEnabled(consent); consent.tap()
        let consented = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == '1'"), object: consent)
        XCTAssertEqual(XCTWaiter.wait(for: [consented], timeout: 5), .completed)
        app.buttons["Load test clip"].tap()
        let make = app.buttons["makeMusic"]
        XCTAssertTrue(make.waitForExistence(timeout: 15))
        make.tap()
        let finished = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: make)
        XCTAssertEqual(XCTWaiter.wait(for: [finished], timeout: 120), .completed)
        let play = app.buttons["play-hiphop"].firstMatch
        XCTAssertTrue(play.waitForExistence(timeout: 120))
        app.swipeUp()
        play.tap()
        XCTAssertTrue(app.buttons["play-reggae"].firstMatch.exists)
        play.tap()
        app.buttons["Save"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Saved"].firstMatch.exists)
        app.buttons["DJ Deck"].firstMatch.tap()
        let music = app.webViews.buttons["Music"]
        XCTAssertTrue(music.waitForExistence(timeout: 20)); music.tap()
        app.webViews.buttons["Saved mix → A"].tap()
        let saved = app.buttons["loadSaved-hiphop"].firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 20)); saved.tap()
        XCTAssertTrue(app.webViews.staticTexts["Jamloom hiphop.wav"].waitForExistence(timeout: 30))
        let deckPlay = app.webViews.buttons["Play A"]
        XCTAssertTrue(deckPlay.isEnabled); deckPlay.tap()
        XCTAssertTrue(app.webViews.buttons["Pause A"].waitForExistence(timeout: 10))
        app.buttons["Improvise"].firstMatch.tap()
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Three generated mixes"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["Saved"].firstMatch.waitForExistence(timeout: 30))
        app.swipeUp()
        app.buttons["share-hiphop"].firstMatch.tap()
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 10) || app.buttons["Copy"].exists || app.buttons["Close"].exists)
        app.terminate(); app.launch()
        let delete = app.buttons["deleteSession"].firstMatch
        XCTAssertTrue(delete.waitForExistence(timeout: 30))
        let count = app.buttons.matching(identifier: "deleteSession").count
        app.swipeUp()
        delete.tap()
        app.buttons["confirmDeleteSession"].firstMatch.tap()
        let removed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "count == %d", count - 1),
            object: app.buttons.matching(identifier: "deleteSession"))
        XCTAssertEqual(XCTWaiter.wait(for: [removed], timeout: 10), .completed)
    }
    func testStoreScreenshotsShowRealSongsAndDecks() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        XCUIDevice.shared.orientation = .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        func capture(_ name: String) {
            let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            image.name = "Store " + name; image.lifetime = .keepAlways; add(image)
        }
        app.launch(); app.buttons["Sing"].firstMatch.tap()
        let song = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "First Light")).firstMatch
        XCTAssertTrue(song.waitForExistence(timeout: 20)); capture("01 Original singing songs")
        song.tap()
        let demo = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Hear song")).firstMatch
        XCTAssertTrue(demo.waitForExistence(timeout: 15)); capture("02 Song and lyrics")
        app.buttons["DJ Deck"].firstMatch.tap(); loadPracticeDecks(app)
        XCTAssertTrue(app.webViews.buttons["Play A"].isEnabled); capture("03 DJ deck portrait")
        XCUIDevice.shared.orientation = .landscapeLeft
        let fits = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.frame.width > app.frame.height && app.webViews.sliders["Crossfader"].isHittable }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [fits], timeout: 10), .completed)
        capture("04 DJ deck landscape")
    }

    func testSingingSongsDemoAndTabCleanup() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); tapVisible(app.tabBars.buttons["Sing"], in: app)
        let course = app.buttons["Course"].firstMatch
        XCTAssertTrue(course.waitForExistence(timeout: 10)); course.tap()
        XCTAssertTrue(app.staticTexts["Free preview. Course sales are not open yet."].waitForExistence(timeout: 5))
        let offer = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); offer.name = "Singing Academy course offer"; offer.lifetime = .keepAlways; add(offer)
        app.buttons["Done"].tap()
        let song = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "First Light")).firstMatch
        XCTAssertTrue(song.waitForExistence(timeout: 20)); song.tap()
        let demo = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Hear song")).firstMatch
        XCTAssertTrue(demo.waitForExistence(timeout: 15)); demo.tap()
        let stop = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Stop")).firstMatch
        XCTAssertTrue(stop.waitForExistence(timeout: 5)); XCTAssertTrue(stop.isEnabled)
        XCTAssertTrue(app.webViews.staticTexts["Microphone off"].exists)
        tapVisible(app.tabBars.buttons["Community"], in: app); tapVisible(app.tabBars.buttons["Sing"], in: app)
        XCTAssertTrue(demo.waitForExistence(timeout: 10)); XCTAssertTrue(demo.isEnabled); XCTAssertFalse(stop.isEnabled)
        app.buttons["Songs"].firstMatch.tap(); XCTAssertTrue(song.waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); screenshot.name = "Singing Academy native course"; screenshot.lifetime = .keepAlways; add(screenshot)
    }

    func testProducedSingingRecordingAndTabCleanup() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); tapVisible(app.tabBars.buttons["Sing"], in: app)
        let song = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "Long Way Home")).firstMatch
        XCTAssertTrue(song.waitForExistence(timeout: 20)); song.tap()
        let demo = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Hear singer")).firstMatch
        XCTAssertTrue(demo.waitForExistence(timeout: 15)); demo.tap()
        XCTAssertTrue(app.webViews.staticTexts["Listen to the recorded singer"].waitForExistence(timeout: 15))
        let stop = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Stop")).firstMatch
        XCTAssertTrue(stop.isEnabled)
        XCTAssertTrue(app.webViews.staticTexts["Microphone off"].exists)
        tapVisible(app.tabBars.buttons["Community"], in: app); tapVisible(app.tabBars.buttons["Sing"], in: app)
        XCTAssertTrue(demo.waitForExistence(timeout: 10)); XCTAssertTrue(demo.isEnabled); XCTAssertFalse(stop.isEnabled)
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); screenshot.name = "Produced original song on iPhone"; screenshot.lifetime = .keepAlways; add(screenshot)
    }

    func testSingingLongPlaybackAndInterruptionMetrics() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Sing"].firstMatch.tap()
        let song = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "First Light")).firstMatch
        XCTAssertTrue(song.waitForExistence(timeout: 20)); song.tap()
        let demo = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Hear song")).firstMatch
        let stop = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Stop")).firstMatch
        XCTAssertTrue(demo.waitForExistence(timeout: 15))
        let options = XCTMeasureOptions(); options.iterationCount = 3
        measure(metrics: [XCTMemoryMetric(application: app), XCTCPUMetric(application: app)], options: options) {
            demo.tap()
            let finished = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isEnabled == true"), object: demo)
            XCTAssertEqual(XCTWaiter.wait(for: [finished], timeout: 70), .completed)
            XCTAssertFalse(stop.isEnabled)
            XCTAssertTrue(app.webViews.staticTexts["Microphone off"].exists)
        }
        demo.tap(); XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(demo.waitForExistence(timeout: 10)); XCTAssertTrue(demo.isEnabled); XCTAssertFalse(stop.isEnabled)
        demo.tap(); app.buttons["Community"].firstMatch.tap(); app.buttons["Sing"].firstMatch.tap()
        XCTAssertTrue(demo.waitForExistence(timeout: 10)); XCTAssertTrue(demo.isEnabled); XCTAssertFalse(stop.isEnabled)
    }

}
