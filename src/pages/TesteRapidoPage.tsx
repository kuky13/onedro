import { useState } from 'react';
import { ArrowLeft, RotateCcw, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';
import { PageHeader } from '@/components/ui/page-header';

const initialData: DeviceChecklistData = {
  tela: { touch_screen: false, multi_touch: false, cores_pixels: false, display_integro: false, sem_manchas: false, brilho: false, rotacao_tela: false },
  audio: { alto_falante: false, microfone: false, alto_falante_auricular: false, entrada_fone: false, gravacao_audio: false },
  cameras: { camera_frontal: false, camera_traseira: false, flash: false, foco_automatico: false, gravacao_video: false },
  sensores: { vibracao: false, botao_volume_mais: false, botao_volume_menos: false, botao_power: false, acelerometro: false, giroscopio: false, proximidade: false, bussola: false, luz_ambiente: false, gps: false },
  sistema: { bateria: false, carregamento: false, wifi: false, bluetooth: false, armazenamento: false },
  extras: { face_id: false, biometria: false, nfc: false, chip_sim: false, tampa_traseira_ok: false }
};

const TesteRapidoPage = () => {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<DeviceChecklistData>({ ...initialData });

  const handleReset = () => {
    setChecklist(JSON.parse(JSON.stringify(initialData)));
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto pb-24">
      













      

      <DeviceChecklist
        value={checklist}
        onChange={setChecklist} />
      
    </div>);

};

export default TesteRapidoPage;