import * as pdfjsLib from 'pdfjs-dist';

// Set local public worker source path dynamically based on base URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL || '/'}pdf.worker.min.mjs`;

export interface HealthReportData {
  id: string;
  fileName: string;
  dateStr: string;
  date: Date;
  
  // Profile
  nickname?: string;
  birthDate?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  
  // Steps & Physical
  steps?: {
    totalSteps: number;
    goalSteps: number;
    distanceKm: number;
  };
  floors?: {
    floorsClimbed: number;
    goalFloors: number;
  };
  
  // Heart Rate
  heartRate?: {
    averageBpm: number;
    minBpm: number;
    maxBpm: number;
    restingBpm?: number;
  };
  
  // Energy & Calories
  energyScore?: number;
  calories?: {
    totalCalories: number;
    activeCalories: number;
    restCalories: number;
  };
  
  // Sleep
  sleep?: {
    totalDurationMinutes: number;
    sleepScore?: number;
    startTime?: string;
    endTime?: string;
    remMinutes: number;
    lightSleepMinutes: number;
    deepSleepMinutes: number;
    awakeMinutes: number;
  };
  
  // Water
  waterIntake?: {
    amountMl: number;
    goalMl: number;
  };
  
  // Body Composition
  bodyComposition?: {
    weightKg: number;
    heightCm?: number;
    bodyFatPercentage?: number;
    skeletalMuscleMassKg?: number;
    bmi?: number;
  };
  
  // Nutrition
  nutrition?: {
    calories: number;
    carbsGrams: number;
    proteinGrams: number;
    fatGrams: number;
    fiberGrams?: number;
  };
  
  // Medical
  bloodPressure: Array<{
    time: string;
    systolic: number;
    diastolic: number;
    pulse?: number;
  }>;
  bloodOxygen: Array<{
    time: string;
    spo2: number;
  }>;
  bloodGlucose: Array<{
    time: string;
    glucose: number;
    mealType?: string;
  }>;
  skinTemperatureAvg?: number;
  sleepApneaSeverity?: string;
  
  // Workouts
  workouts: Array<{
    type: string;
    durationMinutes: number;
    caloriesBurned: number;
    distanceKm?: number;
  }>;
}

export async function parseHealthReportPdf(file: File): Promise<HealthReportData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join('\n');
    fullText += `--- Sayfa ${i} ---\n` + pageText + '\n';
  }
  
  return parseExtractedText(fullText, file.name);
}

function parseExtractedText(text: string, fileName: string): HealthReportData {
  // Extract date
  let date = new Date();
  let dateStr = '';
  
  // E.g., "Rapor Tarihi: 26 Mayıs 2026"
  const dateMatch = text.match(/Rapor Tarihi:\s*([^\n]+)/i);
  if (dateMatch) {
    dateStr = dateMatch[1].trim();
    // Parse Turkish month names to English or parse directly
    date = parseTurkishDate(dateStr);
  } else {
    // Try filename, e.g. "HealthReport_2026_05_26.pdf"
    const fileDateMatch = fileName.match(/HealthReport_(\d{4})_(\d{2})_(\d{2})/i);
    if (fileDateMatch) {
      const [_, year, month, day] = fileDateMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      dateStr = `${day}.${month}.${year}`;
    }
  }

  // E.g., "Kullanıcı: can | Doğum Tarihi: 1995-10-10 | Cinsiyet: Erkek | Boy: 180 cm | Kilo: 75 kg"
  const nicknameMatch = text.match(/Kullanıcı:\s*([^\s|]+)/i);
  const birthDateMatch = text.match(/Doğum Tarihi:\s*([^\s|]+)/i);
  const genderMatch = text.match(/Cinsiyet:\s*([^\s|]+)/i);
  const heightMatch = text.match(/Boy:\s*([\d.,]+)\s*cm/i);
  const weightMatch = text.match(/Kilo:\s*([\d.,]+)\s*kg/i);

  // 1. Aktivite & Adımlar
  // • Toplam Adım: 12500 / Hedef: 6000
  // • Yürünen Mesafe: 8.75 km
  // • Çıkılan Kat: 12 kat / Hedef: 10 kat
  const totalStepsMatch = text.match(/Toplam Adım:\s*(\d+)\s*\/\s*Hedef:\s*(\d+)/i);
  const distanceMatch = text.match(/Yürünen Mesafe:\s*([\d.,]+)\s*km/i);
  const floorsMatch = text.match(/Çıkılan Kat:\s*(\d+)\s*kat\s*\/\s*Hedef:\s*(\d+)\s*kat/i);

  // 2. Kalp Sağlığı
  // • Ortalama Nabız: 75 bpm
  // • Nabız Aralığı: 60 - 145 bpm
  // • Dinlenme Nabzı: 62 bpm
  const avgHrMatch = text.match(/Ortalama Nabız:\s*(\d+)\s*bpm/i);
  const hrRangeMatch = text.match(/Nabız Aralığı:\s*(\d+)\s*-\s*(\d+)\s*bpm/i);
  const restingHrMatch = text.match(/Dinlenme Nabzı:\s*(\d+)\s*bpm/i);

  // 3. Enerji Skoru & Kalori Dengesi
  // • Günlük Enerji Skoru: 85 / 100
  // • Toplam Yakılan Kalori: 2450.5 kcal
  // • Aktif Kalori: 650.0 kcal | Dinlenme Kalorisi: 1800.5 kcal
  const energyScoreMatch = text.match(/Günlük Enerji Skoru:\s*(\d+)\s*\/\s*100/i);
  const totalCalMatch = text.match(/Toplam Yakılan Kalori:\s*([\d.,]+)\s*kcal/i);
  const caloriesBreakdownMatch = text.match(/Aktif Kalori:\s*([\d.,]+)\s*kcal\s*\|\s*Dinlenme Kalorisi:\s*([\d.,]+)\s*kcal/i);

  // 4. Uyku Analizi
  // • Toplam Uyku Süresi: 7 saat 30 dakika (Uyku Skoru: 82/100)
  // • Yatma Zamanı: 23:30 | Uyanma Zamanı: 07:00
  //   - REM Uyku: 90 dk
  //   - Hafif Uyku: 240 dk
  //   - Derin Uyku: 60 dk
  //   - Uyanık Süre: 15 dk
  const sleepDurationMatch = text.match(/Toplam Uyku Süresi:\s*(\d+)\s*saat\s*(\d+)\s*dakika/i);
  const sleepScoreMatch = text.match(/Uyku Skoru:\s*(\d+)\/100/i);
  const sleepTimesMatch = text.match(/Yatma Zamanı:\s*(\d{2}:\d{2})\s*\|\s*Uyanma Zamanı:\s*(\d{2}:\d{2})/i);
  const remMatch = text.match(/REM Uyku:\s*(\d+)\s*dk/i);
  const lightMatch = text.match(/Hafif Uyku:\s*(\d+)\s*dk/i);
  const deepMatch = text.match(/Derin Uyku:\s*(\d+)\s*dk/i);
  const awakeMatch = text.match(/Uyanık Süre:\s*(\d+)\s*dk/i);

  // 5. Sıvı Tüketimi
  // • Alınan Su: 1500 ml / Hedef: 2000 ml
  // or Alınan Su: 1500 ml / Hedef: 2000 ml
  const waterMatch = text.match(/Alınan Su:\s*([\d.,]+)\s*ml\s*\/\s*Hedef:\s*([\d.,]+)\s*ml/i);

  // 6. Vücut Analizi
  // • Ağırlık: 75.5 kg
  // • Boy: 180 cm
  // • Vücut Yağ Oranı: % 18.5
  // • İskelet Kas Kütlesi: 34.2 kg
  // • Vücut Kitle Endeksi (BMI): 23.8
  const weightKgMatch = text.match(/• Ağırlık:\s*([\d.,]+)\s*kg/i);
  const heightCmMatch = text.match(/• Boy:\s*([\d.,]+)\s*cm/i);
  const bodyFatMatch = text.match(/Vücut Yağ Oranı:\s*%\s*([\d.,]+)/i);
  const skeletalMuscleMatch = text.match(/İskelet Kas Kütlesi:\s*([\d.,]+)\s*kg/i);
  const bmiMatch = text.match(/Vücut Kitle Endeksi \(BMI\):\s*([\d.,]+)/i);

  // 7. Beslenme
  // • Tüketilen Toplam Enerji: 2150.0 kcal
  // • Makro Besin Kırılımı: Karbonhidrat: 250.0g | Protein: 120.0g | Yağ: 70.0g
  // • Diyet Lifi: 25.0g
  const nutritionCalMatch = text.match(/Tüketilen Toplam Enerji:\s*([\d.,]+)\s*kcal/i);
  const nutritionMacrosMatch = text.match(/Karbonhidrat:\s*([\d.,]+)g\s*\|\s*Protein:\s*([\d.,]+)g\s*\|\s*Yağ:\s*([\d.,]+)g/i);
  const nutritionFiberMatch = text.match(/Diyet Lifi:\s*([\d.,]+)g/i);

  // 8. Tıbbi Ölçümler (Tansiyon, SpO2, Kan Şekeri, Cilt Sıcaklığı, Uyku Apnesi)
  const bloodPressure: HealthReportData['bloodPressure'] = [];
  const bpRegex = /(\d{2}:\d{2})\s*->\s*Sistolik:\s*(\d+)\s*\|\s*Diastolik:\s*(\d+)(?:\s*\(Nabız:\s*(\d+)\))?/gi;
  let bpMatch;
  while ((bpMatch = bpRegex.exec(text)) !== null) {
    bloodPressure.push({
      time: bpMatch[1],
      systolic: parseInt(bpMatch[2]),
      diastolic: parseInt(bpMatch[3]),
      pulse: bpMatch[4] ? parseInt(bpMatch[4]) : undefined
    });
  }

  const bloodOxygen: HealthReportData['bloodOxygen'] = [];
  const oxygenRegex = /(\d{2}:\d{2})\s*->\s*%\s*(\d+)/gi;
  let oxMatch;
  while ((oxMatch = oxygenRegex.exec(text)) !== null) {
    bloodOxygen.push({
      time: oxMatch[1],
      spo2: parseInt(oxMatch[2])
    });
  }

  const bloodGlucose: HealthReportData['bloodGlucose'] = [];
  // - 12:30 -> 110 mg/dL (Tokluk)
  const glucoseRegex = /(\d{2}:\d{2})\s*->\s*(\d+)\s*mg\/dL(?:\s*\(([^\)]+)\))?/gi;
  let glucMatch;
  while ((glucMatch = glucoseRegex.exec(text)) !== null) {
    bloodGlucose.push({
      time: glucMatch[1],
      glucose: parseInt(glucMatch[2]),
      mealType: glucMatch[3] ? glucMatch[3].trim() : undefined
    });
  }

  const skinTempMatch = text.match(/Ortalama Cilt Sıcaklığı:\s*([\d.,]+)\s*°C/i);
  const apneaMatch = text.match(/Uyku Apnesi Analizi:\s*([^\n]+)/i);

  // 9. Egzersizler
  const workouts: HealthReportData['workouts'] = [];
  // • Koşu: 30 dk - 350.0 kcal | Mesafe: 5.00 km
  // or • Bisiklet: 45 dk - 250 kcal
  const workoutRegex = /•\s*([^:\n]+):\s*(\d+)\s*dk\s*-\s*([\d.,]+)\s*kcal(?:\s*\|\s*Mesafe:\s*([\d.,]+)\s*km)?/gi;
  let workMatch;
  while ((workMatch = workoutRegex.exec(text)) !== null) {
    // Prevent matching sections that might look like this (like steps)
    const type = workMatch[1].trim();
    if (type.toLowerCase().includes("toplam") || type.toLowerCase().includes("alınan") || type.toLowerCase().includes("ortalama")) {
      continue;
    }
    workouts.push({
      type: type,
      durationMinutes: parseInt(workMatch[2]),
      caloriesBurned: parseFloat(workMatch[3].replace(',', '.')),
      distanceKm: workMatch[4] ? parseFloat(workMatch[4].replace(',', '.')) : undefined
    });
  }

  return {
    id: `${date.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    fileName,
    dateStr: dateStr || date.toLocaleDateString('tr-TR'),
    date,
    nickname: nicknameMatch?.[1],
    birthDate: birthDateMatch?.[1],
    gender: genderMatch?.[1],
    heightCm: heightMatch ? parseFloat(heightMatch[1].replace(',', '.')) : undefined,
    weightKg: weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : undefined,
    steps: totalStepsMatch ? {
      totalSteps: parseInt(totalStepsMatch[1]),
      goalSteps: parseInt(totalStepsMatch[2]),
      distanceKm: distanceMatch ? parseFloat(distanceMatch[1].replace(',', '.')) : 0
    } : undefined,
    floors: floorsMatch ? {
      floorsClimbed: parseInt(floorsMatch[1]),
      goalFloors: parseInt(floorsMatch[2])
    } : undefined,
    heartRate: avgHrMatch ? {
      averageBpm: parseInt(avgHrMatch[1]),
      minBpm: hrRangeMatch ? parseInt(hrRangeMatch[1]) : parseInt(avgHrMatch[1]) - 15,
      maxBpm: hrRangeMatch ? parseInt(hrRangeMatch[2]) : parseInt(avgHrMatch[1]) + 40,
      restingBpm: restingHrMatch ? parseInt(restingHrMatch[1]) : undefined
    } : undefined,
    energyScore: energyScoreMatch ? parseInt(energyScoreMatch[1]) : undefined,
    calories: totalCalMatch ? {
      totalCalories: parseFloat(totalCalMatch[1].replace(',', '.')),
      activeCalories: caloriesBreakdownMatch ? parseFloat(caloriesBreakdownMatch[1].replace(',', '.')) : 0,
      restCalories: caloriesBreakdownMatch ? parseFloat(caloriesBreakdownMatch[2].replace(',', '.')) : 0
    } : undefined,
    sleep: sleepDurationMatch ? {
      totalDurationMinutes: parseInt(sleepDurationMatch[1]) * 60 + parseInt(sleepDurationMatch[2]),
      sleepScore: sleepScoreMatch ? parseInt(sleepScoreMatch[1]) : undefined,
      startTime: sleepTimesMatch?.[1],
      endTime: sleepTimesMatch?.[2],
      remMinutes: remMatch ? parseInt(remMatch[1]) : 0,
      lightSleepMinutes: lightMatch ? parseInt(lightMatch[1]) : 0,
      deepSleepMinutes: deepMatch ? parseInt(deepMatch[1]) : 0,
      awakeMinutes: awakeMatch ? parseInt(awakeMatch[1]) : 0
    } : undefined,
    waterIntake: waterMatch ? {
      amountMl: parseFloat(waterMatch[1].replace(',', '.')),
      goalMl: parseFloat(waterMatch[2].replace(',', '.'))
    } : undefined,
    bodyComposition: weightKgMatch ? {
      weightKg: parseFloat(weightKgMatch[1].replace(',', '.')),
      heightCm: heightCmMatch ? parseFloat(heightCmMatch[1].replace(',', '.')) : undefined,
      bodyFatPercentage: bodyFatMatch ? parseFloat(bodyFatMatch[1].replace(',', '.')) : undefined,
      skeletalMuscleMassKg: skeletalMuscleMatch ? parseFloat(skeletalMuscleMatch[1].replace(',', '.')) : undefined,
      bmi: bmiMatch ? parseFloat(bmiMatch[1].replace(',', '.')) : undefined
    } : undefined,
    nutrition: nutritionCalMatch ? {
      calories: parseFloat(nutritionCalMatch[1].replace(',', '.')),
      carbsGrams: nutritionMacrosMatch ? parseFloat(nutritionMacrosMatch[1].replace(',', '.')) : 0,
      proteinGrams: nutritionMacrosMatch ? parseFloat(nutritionMacrosMatch[2].replace(',', '.')) : 0,
      fatGrams: nutritionMacrosMatch ? parseFloat(nutritionMacrosMatch[3].replace(',', '.')) : 0,
      fiberGrams: nutritionFiberMatch ? parseFloat(nutritionFiberMatch[1].replace(',', '.')) : undefined
    } : undefined,
    bloodPressure,
    bloodOxygen,
    bloodGlucose,
    skinTemperatureAvg: skinTempMatch ? parseFloat(skinTempMatch[1].replace(',', '.')) : undefined,
    sleepApneaSeverity: apneaMatch ? apneaMatch[1].trim() : undefined,
    workouts
  };
}

function parseTurkishDate(dateStr: string): Date {
  const months: Record<string, number> = {
    'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
    'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
  };
  
  // Format E.g.: "26 Mayıs 2026"
  const parts = dateStr.toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthName = parts[1];
    const year = parseInt(parts[2]);
    const month = months[monthName] !== undefined ? months[monthName] : 0;
    return new Date(year, month, day);
  }
  
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? new Date() : new Date(parsed);
}
