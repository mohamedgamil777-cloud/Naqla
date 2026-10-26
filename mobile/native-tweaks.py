# Applies Naqla's native settings after `npx cap add android|ios` (safe to re-run).
# Usage (from mobile/): python native-tweaks.py
import re

APPS = {
    # customer: map "my location" only. driver: location + camera for proof of delivery.
    "customer": {"camera": False},
    "driver": {"camera": True},
}

LOC = "نقلة بتستخدم موقعك عشان تحدد مكان الاستلام والتسليم على الخريطة."
CAM = "نقلة بتستخدم الكاميرا عشان تصوّر إثبات التسليم."
PHOTOS = "نقلة بتستخدم الصور عشان ترفع صورة إثبات التسليم."


def edit(path, fn):
    with open(path, encoding="utf-8") as f:
        s = f.read()
    n = fn(s)
    if n != s:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(n)
        print("updated", path)


for app, opt in APPS.items():
    # ---------- Android ----------
    perms = [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
    ] + (["android.permission.CAMERA"] if opt["camera"] else [])

    def android(s):
        for p in perms:
            if p not in s:
                s = s.replace(
                    '<uses-permission android:name="android.permission.INTERNET" />',
                    f'<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="{p}" />',
                )
        if opt["camera"] and "android.hardware.camera" not in s:
            s = s.replace(
                "    <!-- Permissions -->",
                '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n\n    <!-- Permissions -->',
            )
        if 'android:screenOrientation' not in s:
            s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"')
        return s

    edit(f"{app}/android/app/src/main/AndroidManifest.xml", android)

    # ---------- iOS ----------
    keys = {"NSLocationWhenInUseUsageDescription": LOC}
    if opt["camera"]:
        keys["NSCameraUsageDescription"] = CAM
        keys["NSPhotoLibraryUsageDescription"] = PHOTOS

    def ios(s):
        s = s.replace("<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>", "<key>CFBundleDevelopmentRegion</key>\n\t<string>ar</string>")
        for k, v in keys.items():
            if k not in s:
                s = s.replace("<key>UIRequiredDeviceCapabilities</key>", f"<key>{k}</key>\n\t<string>{v}</string>\n\t<key>UIRequiredDeviceCapabilities</key>")
        # iPhone: portrait only (iPad keeps all orientations, which Apple requires)
        s = re.sub(
            r"(<key>UISupportedInterfaceOrientations</key>\s*<array>)(.*?)(</array>)",
            r"\1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\3",
            s,
            count=1,
            flags=re.S,
        )
        return s

    edit(f"{app}/ios/App/App/Info.plist", ios)
