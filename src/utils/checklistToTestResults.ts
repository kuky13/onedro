import type { DeviceChecklistData } from "@/components/service-orders/DeviceChecklist";
import type { TestResults } from "@/types/deviceTest";

const toResult = (ok: boolean) => ({
  status: ok ? ("passed" as const) : ("failed" as const),
  score: ok ? 100 : 0,
  completed_at: new Date().toISOString(),
  details: { manual: true },
});

export const checklistToTestResults = (checklist: DeviceChecklistData): TestResults => {
  const displayTouchOk = !!(checklist.tela.touch_screen && checklist.tela.multi_touch);
  const displayColorsOk = !!(checklist.tela.cores_pixels && checklist.tela.sem_manchas && checklist.tela.brilho);
  const audioSpeakerOk = !!checklist.audio.alto_falante;
  const audioMicOk = !!(checklist.audio.microfone && checklist.audio.gravacao_audio);
  const cameraFrontOk = !!checklist.cameras.camera_frontal;
  const cameraBackOk = !!(checklist.cameras.camera_traseira && checklist.cameras.flash && checklist.cameras.gravacao_video);
  const vibrationOk = !!checklist.sensores.vibracao;
  const buttonsOk = !!(
    checklist.sensores.botao_volume_mais &&
    checklist.sensores.botao_volume_menos &&
    checklist.sensores.botao_power
  );
  const batteryOk = !!(checklist.sistema.bateria && checklist.sistema.carregamento);
  const sensorsOk = !!(
    checklist.sensores.acelerometro &&
    checklist.sensores.giroscopio &&
    checklist.sensores.proximidade &&
    checklist.sensores.bussola &&
    checklist.sensores.luz_ambiente
  );
  const locationOk = !!checklist.sensores.gps;

  return {
    display_touch: toResult(displayTouchOk),
    display_colors: toResult(displayColorsOk),
    audio_speaker: toResult(audioSpeakerOk),
    audio_mic: toResult(audioMicOk),
    camera_front: toResult(cameraFrontOk),
    camera_back: toResult(cameraBackOk),
    vibration: toResult(vibrationOk),
    buttons: toResult(buttonsOk),
    battery: toResult(batteryOk),
    sensors: toResult(sensorsOk),
    location: toResult(locationOk),

    display_integro: toResult(!!checklist.tela.display_integro),
    alto_falante_auricular: toResult(!!checklist.audio.alto_falante_auricular),
    entrada_fone: toResult(!!checklist.audio.entrada_fone),
    foco_automatico: toResult(!!checklist.cameras.foco_automatico),
    bluetooth: toResult(!!checklist.sistema.bluetooth),
    face_id: toResult(!!checklist.extras.face_id),
    biometria: toResult(!!checklist.extras.biometria),
    nfc: toResult(!!checklist.extras.nfc),
    chip_sim: toResult(!!checklist.extras.chip_sim),
    tampa_traseira_ok: toResult(!!checklist.extras.tampa_traseira_ok),
  };
};

