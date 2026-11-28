package app.quranaccespourtous.mobile;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/** Uses Android's speech service, not the unsupported WebView speech API. */
@CapacitorPlugin(name = "HifzSpeech", permissions = {
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class HifzSpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneGranted");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void microphoneGranted(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Autorisez le microphone dans les réglages Android de l’application.");
            return;
        }
        begin(call);
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            recognizer.setRecognitionListener(null);
            recognizer.cancel();
            recognizer.destroy();
            recognizer = null;
        }
    }

    private void begin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                destroyRecognizer();
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    public void onReadyForSpeech(Bundle params) {}
                    public void onBeginningOfSpeech() {}
                    public void onRmsChanged(float rms) {}
                    public void onBufferReceived(byte[] buffer) {}
                    public void onEndOfSpeech() {}
                    public void onEvent(int type, Bundle params) {}
                    public void onPartialResults(Bundle results) { emit(results, false); }
                    public void onResults(Bundle results) { emit(results, true); destroyRecognizer(); }
                    public void onError(int code) {
                        JSObject result = new JSObject();
                        result.put("error", code);
                        notifyListeners("result", result);
                        destroyRecognizer();
                    }
                    private void emit(Bundle results, boolean isFinal) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        JSObject result = new JSObject();
                        result.put("text", matches != null && !matches.isEmpty() ? matches.get(0) : "");
                        result.put("final", isFinal);
                        notifyListeners("result", result);
                    }
                });
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA");
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                recognizer.startListening(intent);
                call.resolve();
            } catch (Exception error) {
                destroyRecognizer();
                call.reject("Impossible d’accéder au microphone Android.");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { destroyRecognizer(); call.resolve(); });
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(this::destroyRecognizer);
    }
}