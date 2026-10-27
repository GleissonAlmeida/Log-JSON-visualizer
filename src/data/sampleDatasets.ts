export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  badge: string;
  data: any[];
  rawString?: string;
}

// Generate realistic time-series points
function generateTimeSeries() {
  const baseTime = new Date('2026-10-24T08:00:00Z').getTime();
  const iotData = [];

  for (let i = 0; i < 60; i++) {
    const t = new Date(baseTime + i * 60000).toISOString().substring(11, 19);
    const ambientTemp = Number((22.5 + Math.sin(i / 10) * 4.2 + (Math.random() - 0.5) * 0.8).toFixed(1));
    const humidity = Number((58 - Math.sin(i / 12) * 8 + (Math.random() - 0.5) * 2).toFixed(1));
    const pressure = Number((1013.2 + Math.cos(i / 15) * 2.5 + (Math.random() - 0.5) * 0.4).toFixed(1));
    const vibrationRms = Number((0.85 + (i > 35 && i < 45 ? 1.8 : 0) + Math.random() * 0.35).toFixed(2));
    const batteryPct = Number(Math.max(10, 98 - i * 0.15).toFixed(1));

    iotData.push({
      timestamp: t,
      sensor_id: 'IOT-ESP32-STATION-01',
      temperatura: ambientTemp,
      umidade: humidity,
      pressao_hpa: pressure,
      vibracao_rms: vibrationRms,
      bateria_pct: batteryPct,
      status: vibrationRms > 2.0 ? 'ALERTA' : 'NORMAL'
    });
  }

  return iotData;
}

function generateServerData() {
  const baseTime = new Date('2026-10-24T12:00:00Z').getTime();
  const serverLogs = [];

  for (let i = 0; i < 70; i++) {
    const timeStr = new Date(baseTime + i * 30000).toISOString().substring(11, 19);
    const spike = (i >= 25 && i <= 35) ? 3.5 : 1;
    const rps = Math.round((280 + Math.sin(i / 8) * 120 + Math.random() * 40) * (spike > 1 ? 1.8 : 1));
    const cpu = Number(Math.min(99.5, (38 + (rps / 600) * 45 + (Math.random() - 0.5) * 6)).toFixed(1));
    const memory = Math.round(1800 + cpu * 18 + i * 8 + Math.random() * 30);
    const latencyP95 = Number((24 + (cpu > 70 ? (cpu - 70) * 6 : 0) + Math.random() * 8).toFixed(1));
    const errorRate = Number((latencyP95 > 80 ? 2.8 + Math.random() * 1.5 : 0.12 + Math.random() * 0.08).toFixed(2));

    serverLogs.push({
      horario: timeStr,
      servidor: 'k8s-pod-auth-api-7b9d',
      requisicoes_sec: rps,
      cpu_percent: cpu,
      memoria_mb: memory,
      latencia_p95_ms: latencyP95,
      taxa_erros_pct: errorRate
    });
  }

  return serverLogs;
}

function generateWearableData() {
  const wearableLogs = [];
  let currentAlt = 720;

  for (let step = 0; step < 50; step++) {
    const elapsedMinutes = step * 2;
    const intensity = step > 10 && step < 35 ? 1.5 : 0.9;
    const heartRate = Math.round(92 + intensity * 42 + Math.sin(step / 4) * 12 + (Math.random() - 0.5) * 6);
    const speed = Number((8.2 * intensity + (Math.random() - 0.5) * 1.2).toFixed(1));
    const cadence = Math.round(155 + intensity * 15 + Math.random() * 6);
    currentAlt += Number(((Math.random() - 0.45) * 3).toFixed(1));
    const calories = Math.round(step * 14.5 * intensity);

    wearableLogs.push({
      minuto: elapsedMinutes,
      frequencia_cardiaca_bpm: heartRate,
      velocidade_kmh: speed,
      cadencia_spm: cadence,
      altitude_m: Number(currentAlt.toFixed(1)),
      calorias_kcal: calories
    });
  }

  return wearableLogs;
}

import { CAN_BUS_RECORDS } from './canBusData';

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'can-bus-vehicle',
    name: 'Telemetria Veicular CAN Bus (LOG_99fc1f91)',
    description: '1450 registros com amostra (#), BrakeSwitch, WheelBasedVehicleSpeed, marcha atual e selecionada.',
    badge: 'CAN Bus & Automotivo',
    data: CAN_BUS_RECORDS,
  },
  {
    id: 'iot-sensors',
    name: 'Telemetria IoT & Sensores Industriais',
    description: 'Log de temperatura, umidade, pressão atmosférica, nível de bateria e vibração RMS.',
    badge: 'Hardware & IoT',
    data: generateTimeSeries(),
  },
  {
    id: 'server-metrics',
    name: 'Servidor Web & Performance da API',
    description: 'Métricas de requisições por segundo, uso de CPU, consumo de memória e latência P95.',
    badge: 'DevOps & Cloud',
    data: generateServerData(),
  },
  {
    id: 'wearable-fitness',
    name: 'Atividade Física & Bio-Sensores',
    description: 'Registro de frequência cardíaca, velocidade, cadência de passos e altitude.',
    badge: 'Saúde & Wearable',
    data: generateWearableData(),
  },
];
