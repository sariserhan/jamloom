import XCTest

final class PurchaseReviewTests: XCTestCase {
    func testRealAccountPurchaseOfferScreenshots() throws {
        let env = ProcessInfo.processInfo.environment
        try XCTSkipUnless(env["JAMLOOM_REVIEW_SCREENSHOTS"] == "1", "Explicit deployed account screenshot check only")
        let email = try XCTUnwrap(env["JAMLOOM_REVIEW_EMAIL"]), password = try XCTUnwrap(env["JAMLOOM_REVIEW_PASSWORD"])
        let app = XCUIApplication(); app.launch()
        defer { app.terminate() }
        let account = app.buttons["Account"].firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 20)); account.tap()
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 10)); emailField.tap(); emailField.typeText(email)
        app.secureTextFields["Password"].tap(); app.secureTextFields["Password"].typeText(password)
        app.buttons["Sign in"].tap()
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: 30))
        if env["JAMLOOM_REVIEW_SCREEN"] == "singing" {
            app.navigationBars["Jamloom account"].buttons["Done"].tap()
            app.tabBars.buttons["Sing"].tap()
            let course = app.buttons["Course"]; XCTAssertTrue(course.waitForExistence(timeout: 10)); course.tap()
            let offer = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Unlock course")).firstMatch
            XCTAssertTrue(offer.waitForExistence(timeout: 30)); XCTAssertTrue(offer.isEnabled)
            let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); shot.name = "Singing Academy actual StoreKit offer"; shot.lifetime = .keepAlways; add(shot)
        } else {
            let creator = app.buttons["purchase-com.jamloom.creator.monthly"], topup = app.buttons["purchase-com.jamloom.credits.topup150"]
            // Form creates off-screen rows lazily; scroll before asserting they exist.
            for _ in 0..<8 { if creator.exists && topup.exists && creator.isHittable && topup.isHittable { break }; app.swipeUp() }
            XCTAssertTrue(creator.waitForExistence(timeout: 30)); XCTAssertTrue(topup.exists)
            XCTAssertTrue(creator.isHittable); XCTAssertTrue(topup.isHittable)
            XCTAssertTrue(creator.label.contains("15")); XCTAssertTrue(topup.label.contains("10"))
            let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); shot.name = "Creator and topup actual StoreKit offers"; shot.lifetime = .keepAlways; add(shot)
        }
        // This captures the normal offer UI. It never taps a purchase or refund.
        if env["JAMLOOM_REVIEW_NATIVE_CAPTURE"] == "1" {
            // CoreDevice captures the physical 1179-pixel screen; XCTest rounds it to 1178.
            print("JAMLOOM_REVIEW_CAPTURE_READY")
            Thread.sleep(forTimeInterval: 25)
        }
    }
}
