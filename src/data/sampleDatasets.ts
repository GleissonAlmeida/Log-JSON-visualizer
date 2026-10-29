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

function generateIndustrialScadaData() {
  const scadaLogs = [];
  const baseTime = new Date('2026-10-24T14:00:00Z').getTime();
  for (let i = 0; i < 80; i++) {
    const timeStr = new Date(baseTime + i * 15000).toISOString().substring(11, 19);
    const rpm = Math.round(1740 + Math.sin(i / 6) * 55 + (Math.random() - 0.5) * 12);
    const currentA = Number((18.4 + (rpm - 1700) * 0.08 + (Math.random() - 0.5) * 0.8).toFixed(2));
    const voltageV = Number((380.2 + Math.cos(i / 10) * 4.2 + (Math.random() - 0.5) * 0.9).toFixed(1));
    const windingTempC = Number((62.0 + (i * 0.22) + Math.sin(i / 8) * 2.5).toFixed(1));
    const powerFactor = Number((0.88 + Math.cos(i / 12) * 0.04).toFixed(3));
    scadaLogs.push({
      horario: timeStr,
      motor_id: 'MOTOR-IND-WEG-W22',
      rotacao_rpm: rpm,
      corrente_a: currentA,
      tensao_v: voltageV,
      temp_enrolamento_c: windingTempC,
      fator_potencia: powerFactor,
    });
  }
  return scadaLogs;
}

function generateDroneTelemetryData() {
  const droneLogs = [];
  const baseTime = new Date('2026-10-24T16:30:00Z').getTime();
  for (let i = 0; i < 60; i++) {
    const timeStr = new Date(baseTime + i * 1000).toISOString().substring(11, 19);
    const altitude = Number((12.5 + Math.sin(i / 8) * 8.2 + i * 0.4).toFixed(1));
    const speed = Number((18.2 + Math.cos(i / 6) * 6.5 + (Math.random() - 0.5) * 1.5).toFixed(1));
    const pitch = Number((Math.sin(i / 4) * 14.5 + (Math.random() - 0.5) * 2.0).toFixed(1));
    const roll = Number((Math.cos(i / 5) * 11.2 + (Math.random() - 0.5) * 1.8).toFixed(1));
    const batteryPct = Number(Math.max(8, 98 - i * 0.4).toFixed(1));
    const windSpeedMs = Number((4.5 + Math.sin(i / 9) * 2.8 + (Math.random() - 0.5) * 0.8).toFixed(1));
    droneLogs.push({
      tempo: timeStr,
      altitude_m: altitude,
      velocidade_kmh: speed,
      inclinacao_pitch_deg: pitch,
      rolagem_roll_deg: roll,
      bateria_pct: batteryPct,
      vento_ms: windSpeedMs,
    });
  }
  return droneLogs;
}

import { CAN_BUS_RECORDS } from './canBusData';

function generateCanBusCsv(): string {
  const headers = ['#', 'BrakeSwitch', 'WheelBasedVehicleSpeed', 'curr_gear', 'sel_gear'];
  const lines = [headers.join(',')];
  for (const r of CAN_BUS_RECORDS) {
    lines.push([
      r['#'] !== undefined ? r['#'] : '',
      r['BrakeSwitch'] !== undefined ? r['BrakeSwitch'] : '',
      r['WheelBasedVehicleSpeed'] !== undefined ? r['WheelBasedVehicleSpeed'] : '',
      r['curr_gear'] !== undefined ? r['curr_gear'] : '',
      r['sel_gear'] !== undefined ? r['sel_gear'] : '',
    ].join(','));
  }
  return lines.join('\n');
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'can-bus-vehicle',
    name: 'Telemetria Veicular CAN Bus (JSONL)',
    description: '1450 registros automotivos com freio (BrakeSwitch), velocidade das rodas, marcha atual e selecionada.',
    badge: 'CAN Bus & Automotivo',
    data: CAN_BUS_RECORDS,
  },
  {
    id: 'can-bus-csv',
    name: 'Telemetria CAN Bus Formato CSV (sample_can_bus.csv)',
    description: '1450 registros em formato CSV com separador por vírgula, índice sequencial # e sinais veiculares esparsos.',
    badge: 'Tabela CSV',
    data: CAN_BUS_RECORDS,
    rawString: generateCanBusCsv(),
  },
  {
    id: 'industrial-scada',
    name: 'Monitoramento SCADA & Motores Elétricos',
    description: '80 registros de telemetria industrial: rotação (RPM), corrente (A), tensão (V), temperatura de enrolamento (°C) e fator de potência.',
    badge: 'SCADA & Motores',
    data: generateIndustrialScadaData(),
  },
  {
    id: 'iot-sensors',
    name: 'Telemetria IoT & Sensores Industriais',
    description: '60 registros de temperatura, umidade, pressão atmosférica, nível de bateria e vibração RMS.',
    badge: 'Hardware & IoT',
    data: generateTimeSeries(),
  },
  {
    id: 'server-metrics',
    name: 'Servidor Web & Performance da API',
    description: '70 registros de métricas de requisições por segundo (RPS), CPU %, memória MB, latência P95 e taxa de erros.',
    badge: 'DevOps & Cloud',
    data: generateServerData(),
  },
  {
    id: 'wearable-fitness',
    name: 'Atividade Física & Bio-Sensores',
    description: '50 registros com frequência cardíaca (BPM), velocidade (km/h), cadência de passos e altitude.',
    badge: 'Saúde & Wearable',
    data: generateWearableData(),
  },
  {
    id: 'drone-telemetry',
    name: 'Telemetria de Voo Drone / VANT',
    description: '60 amostras de dinâmica de voo: altitude (m), velocidade (km/h), inclinação pitch/roll, bateria % e vento (m/s).',
    badge: 'Aeroespacial & Drones',
    data: generateDroneTelemetryData(),
  },
];
