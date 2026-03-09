import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';

const initialData: DeviceChecklistData = {
  tela: { touch_screen: false, multi_touch: false, cores_pixels: false, display_integro: false, sem_manchas: false, brilho: false, rotacao_tela: false },
  audio: { alto_falante: false, microfone: false, alto_falante_auricular: false, entrada_fone: false, gravacao_audio: false },
  cameras: { camera_frontal: false, camera_traseira: false, flash: false, foco_automatico: false, gravacao_video: false },
  sensores: { vibracao: false, botao_volume_mais: false, botao_volume_menos: false, botao_power: false, acelerometro: false, giroscopio: false, proximidade: false, bussola: false, luz_ambiente: false, gps: false },
  sistema: { bateria: false, carregamento: false, wifi: false, bluetooth: false, armazenamento: false },
  extras: { face_id: false, biometria: false, nfc: false, chip_sim: false, tampa_traseira_ok: false }
};

const TesteRapidoPage = () => {
  const [checklist, setChecklist] = useState<DeviceChecklistData>({ ...initialData });

  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Teste Rápido</h1>
      </div>










      

      <DeviceChecklist
        value={checklist}
        onChange={setChecklist} />
      
    </div>);

};

export default TesteRapidoPage;