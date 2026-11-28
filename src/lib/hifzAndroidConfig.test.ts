// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('déclare le microphone USB optionnel, les permissions et le service vocal, avec inscription native idempotente', () => {
  const root = mkdtempSync(join(tmpdir(), 'hifz-android-'));
  try {
    const main = join(root, 'android/app/src/main');
    const java = join(main, 'java/app/quranaccespourtous/mobile');
    mkdirSync(java, { recursive: true });
    writeFileSync(join(root, 'capacitor.config.json'), JSON.stringify({ appId: 'app.quranaccespourtous.mobile' }));
    writeFileSync(join(main, 'AndroidManifest.xml'), '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application /></manifest>');
    writeFileSync(join(java, 'MainActivity.java'), 'package app.quranaccespourtous.mobile;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {}');
    const configure = () => execFileSync('node', [resolve('scripts/android/configure-hifz.mjs')], { cwd: root });
    configure(); configure();
    const manifest = readFileSync(join(main, 'AndroidManifest.xml'), 'utf8');
    expect(manifest.match(/android.permission.RECORD_AUDIO/g)).toHaveLength(1);
    expect(manifest).toContain('android.permission.MODIFY_AUDIO_SETTINGS');
    expect(manifest).toContain('android.hardware.microphone" android:required="false"');
    expect(manifest).toContain('android.speech.RecognitionService');
    expect(readFileSync(join(java, 'MainActivity.java'), 'utf8').match(/registerPlugin\(HifzSpeechPlugin.class\)/g)).toHaveLength(1);
    expect(readFileSync(join(java, 'HifzSpeechPlugin.java'), 'utf8')).toContain('package app.quranaccespourtous.mobile;');
  } finally { rmSync(root, { recursive: true, force: true }); }
});