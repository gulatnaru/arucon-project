import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const mobileRoot = fileURLToPath(new URL('../..', import.meta.url));
const checkerPath = join(mobileRoot, 'scripts', 'check-native-generation.mjs');

async function copyFixtureFile(fixtureRoot: string, source: string, destination = source) {
  const destinationPath = join(fixtureRoot, destination);
  await mkdir(dirname(destinationPath), { recursive: true });
  await copyFile(join(mobileRoot, source), destinationPath);
}

test('native generation checker supports Android-only CNG and rejects invalid platforms', async t => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'arucon-android-generation-'));
  t.after(async () => {
    assert.equal(dirname(fixtureRoot), tmpdir());
    assert.match(basename(fixtureRoot), /^arucon-android-generation-/u);
    await rm(fixtureRoot, { recursive: true, force: true });
  });

  await writeFile(join(fixtureRoot, 'app.json'), JSON.stringify({
    expo: {
      plugins: [[
        './plugins/withAruconNativeIntegration',
        { healthDeclarationsEnabled: false, widgetTargetsEnabled: true },
      ]],
    },
  }), 'utf8');

  const androidWidgetTemplate =
    'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template';
  const androidWidgetLayoutTemplate =
    'native/arucon-widget-template/android/res/layout/arucon_widget.xml.template';
  const androidWidgetInfoTemplate =
    'native/arucon-widget-template/android/res/xml/arucon_widget_info.xml.template';
  const androidWidgetBackgroundTemplate =
    'native/arucon-widget-template/android/res/drawable/arucon_widget_background.xml.template';
  const widgetPetAsset = 'native/arucon-widget-template/assets/arucon_widget_pet.png';
  await Promise.all([
    copyFixtureFile(fixtureRoot, androidWidgetTemplate),
    copyFixtureFile(
      fixtureRoot,
      androidWidgetTemplate,
      'android/app/src/main/java/com/arucon/widget/AruconWidgetProvider.kt',
    ),
    copyFixtureFile(fixtureRoot, androidWidgetLayoutTemplate),
    copyFixtureFile(
      fixtureRoot,
      androidWidgetLayoutTemplate,
      'android/app/src/main/res/layout/arucon_widget.xml',
    ),
    copyFixtureFile(fixtureRoot, androidWidgetInfoTemplate),
    copyFixtureFile(
      fixtureRoot,
      androidWidgetInfoTemplate,
      'android/app/src/main/res/xml/arucon_widget_info.xml',
    ),
    copyFixtureFile(fixtureRoot, androidWidgetBackgroundTemplate),
    copyFixtureFile(
      fixtureRoot,
      androidWidgetBackgroundTemplate,
      'android/app/src/main/res/drawable/arucon_widget_background.xml',
    ),
    copyFixtureFile(fixtureRoot, widgetPetAsset),
    copyFixtureFile(
      fixtureRoot,
      widgetPetAsset,
      'android/app/src/main/res/drawable-nodpi/arucon_widget_pet.png',
    ),
    copyFixtureFile(
      fixtureRoot,
      'native/arucon-health/android/src/main/java/com/arucon/health/AruconHealthModule.kt',
    ),
    copyFixtureFile(
      fixtureRoot,
      'native/arucon-widget/android/src/main/java/com/arucon/widgetbridge/AruconWidgetBridgeModule.kt',
    ),
  ]);

  const manifestPath = join(fixtureRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `
    <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <application>
        <meta-data android:name="com.arucon.native.CONTRACT_VERSION" android:value="1" />
        <activity android:name=".MainActivity" android:configChanges="keyboard|screenSize|fontScale" />
        <receiver android:name="com.arucon.widget.AruconWidgetProvider">
          <intent-filter>
            <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
          </intent-filter>
          <meta-data android:name="android.appwidget.provider" android:resource="@xml/arucon_widget_info" />
        </receiver>
      </application>
    </manifest>
  `, 'utf8');

  const androidResult = spawnSync(process.execPath, [checkerPath, '--platform', 'android'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.equal(androidResult.status, 0, `${androidResult.stdout}\n${androidResult.stderr}`);
  const report = JSON.parse(androidResult.stdout);
  assert.equal(report.platform, 'android');
  assert.equal(report.passed, true);
  assert.equal(Object.keys(report.checkedFiles).some(key => /^(?:ios|swift)/u.test(key)), false);
  assert.equal(Object.values(report.checks).every(Boolean), true);
  assert.equal(report.checks.androidMainActivityHandlesFontScaleChanges, true);

  const widgetInfoPath = join(fixtureRoot, 'android', 'app', 'src', 'main', 'res', 'xml', 'arucon_widget_info.xml');
  const widgetInfo = await readFile(widgetInfoPath, 'utf8');
  await writeFile(widgetInfoPath, widgetInfo.replace(
    'android:updatePeriodMillis="0"',
    'android:updatePeriodMillis="1"',
  ), 'utf8');
  const mutatedResult = spawnSync(process.execPath, [checkerPath, '--platform', 'android'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.equal(mutatedResult.status, 1, `${mutatedResult.stdout}\n${mutatedResult.stderr}`);
  const mutatedReport = JSON.parse(mutatedResult.stdout);
  assert.equal(mutatedReport.passed, false);
  assert.equal(mutatedReport.checks.androidWidgetSourcesMatchTemplates, false);
  assert.equal(mutatedReport.checks.widgetNoAutomaticCadence, false);

  const defaultResult = spawnSync(process.execPath, [checkerPath], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.notEqual(defaultResult.status, 0);
  assert.match(`${defaultResult.stdout}\n${defaultResult.stderr}`, /ios[\\/]/u);

  const invalidResult = spawnSync(process.execPath, [checkerPath, '--platform', 'windows'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.notEqual(invalidResult.status, 0);
  assert.match(invalidResult.stderr, /--platform must be one of: all, android, ios/u);
});
