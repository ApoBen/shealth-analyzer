import * as pdfjsLib from 'pdfjs-dist';

// Set local public worker source path dynamically using Vite's ?url import
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

// Helper to parse floats that may have spaces, commas, or dots as decimals (e.g. "105 0" or "8,08" or "971.6")
function parseFlexibleFloat(valStr: string | undefined): number | undefined {
  if (!valStr) return undefined;
  const cleaned = valStr.trim();
  // Match standard digits optionally followed by a separator (dot, comma, space) and fraction digits
  const match = cleaned.match(/^(\d+)(?:[\s.,]+(\d+))?/);
  if (!match) return undefined;
  const whole = match[1];
  const fraction = match[2] || '0';
  return parseFloat(`${whole}.${fraction}`);
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
  
  // Replace null bytes (\x00) with spaces to fix regex failures caused by pdfjs-dist output
  const sanitizedText = fullText.replace(/\0/g, ' ');
  
  return parseExtractedText(sanitizedText, file.name);
}

function parseExtractedText(text: string, fileName: string): HealthReportData {
  // Extract date
  let date = new Date();
  let dateStr = '';
  
  // Support Turkish character issues (e.g. "Rapor Tar h : 26 Mayıs 2026")
  const dateMatch = text.match(/Rapor\s+Tar\s*h\s*:\s*([^\n]+)/i);
  if (dateMatch) {
    dateStr = dateMatch[1].trim();
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

  // Profile data
  const nicknameMatch = text.match(/Kullanıcı:\s*([^\s|]+)/i);
  const birthDateMatch = text.match(/Doğum\s+Tar\s*h\s*:\s*([^\s|]+)/i);
  const genderMatch = text.match(/C\s*ns\s*yet:\s*([^\s|]+)/i);
  const heightMatch = text.match(/Boy:\s*([\d\s.,]+)\s*cm/i);
  const weightMatch = text.match(/K\s*lo:\s*([\d\s.,]+)\s*kg/i);

  // 1. Aktivite & Adımlar (e.g. "Toplam Adım: 11211 / Hedef: 6000")
  const totalStepsMatch = text.match(/Toplam\s+Adım:\s*(\d+)\s*\/\s*Hedef:\s*(\d+)/i);
  const distanceMatch = text.match(/Yürünen\s+Mesafe:\s*([\d\s.,]+)\s*km/i);
  const floorsMatch = text.match(/Çıkılan\s+Kat:\s*(\d+)\s*kat\s*\/\s*Hedef:\s*(\d+)\s*kat/i);

  // 2. Kalp Sağlığı (Nabız)
  const avgHrMatch = text.match(/Ortalama\s+Nabız:\s*(\d+)\s*bpm/i);
  const hrRangeMatch = text.match(/Nabız\s+Aralığı:\s*(\d+)\s*-\s*(\d+)\s*bpm/i);
  const restingHrMatch = text.match(/D\s*nlenme\s+Nabzı:\s*(\d+)\s*bpm/i);

  // 3. Enerji Skoru & Kalori Dengesi
  const energyScoreMatch = text.match(/Enerj\s*Skoru:\s*(\d+)\s*\/\s*100/i) || text.match(/Günlük\s+Enerj\s*Skoru:\s*(\d+)/i);
  const totalCalMatch = text.match(/Toplam\s+Yakılan\s+Kalor\s*:\s*([\d\s.,]+)\s*kcal/i);
  const caloriesBreakdownMatch = text.match(/Akt\s*f\s+Kalor\s*:\s*([\d\s.,]+)\s*kcal\s*\|\s*D\s*nlenme\s+Kalor\s*s\s*:\s*([\d\s.,]+)\s*kcal/i);

  // 4. Uyku Analizi
  const sleepDurationMatch = text.match(/Toplam\s+Uyku\s+Süres\s*:\s*(\d+)\s*saat\s*(\d+)\s*dak\s*ka/i);
  const sleepScoreMatch = text.match(/Uyku\s+Skoru:\s*(\d+)\/100/i);
  // Match times that might have spaces instead of colons (e.g. "23 09" or "07 50")
  const sleepTimesMatch = text.match(/Yatma\s+Zamanı:\s*(\d{2})[\s:]+(\d{2})\s*\|\s*Uyanma\s+Zamanı:\s*(\d{2})[\s:]+(\d{2})/i);
  const remMatch = text.match(/REM\s+Uyku:\s*(\d+)\s*dk/i);
  const lightMatch = text.match(/Haf\s*f\s+Uyku:\s*(\d+)\s*dk/i);
  const deepMatch = text.match(/Der\s*n\s+Uyku:\s*(\d+)\s*dk/i);
  const awakeMatch = text.match(/Uyanık\s+Süre:\s*(\d+)\s*dk/i);

  // 5. Sıvı Tüketimi
  const waterMatch = text.match(/Alınan\s+Su:\s*([\d\s.,]+)\s*ml\s*\/\s*Hedef:\s*([\d\s.,]+)\s*ml/i);

  // 6. Vücut Analizi
  const bodyWeightMatch = text.match(/•\s*Ağırlık:\s*([\d\s.,]+)\s*kg/i);
  const bodyHeightMatch = text.match(/•\s*Boy:\s*([\d\s.,]+)\s*cm/i);
  const bodyFatMatch = text.match(/Vücut\s+Yağ\s+Oranı:\s*%\s*([\d\s.,]+)/i);
  const skeletalMuscleMatch = text.match(/İskelet\s+Kas\s+Kütles\s*:\s*([\d\s.,]+)\s*kg/i);
  const bmiMatch = text.match(/Vücut\s+K\s*tle\s+Endeks\s*\(BMI\):\s*([\d\s.,]+)/i);

  // 7. Beslenme
  const nutritionCalMatch = text.match(/Tüketilen\s+Toplam\s+Enerji:\s*([\d\s.,]+)\s*kcal/i) || text.match(/Tüket len\s+Toplam\s+Enerj\s*:\s*([\d\s.,]+)\s*kcal/i);
  const nutritionMacrosMatch = text.match(/Karbonhidrat:\s*([\d\s.,]+)g\s*\|\s*Protein:\s*([\d\s.,]+)g\s*\|\s*Yağ:\s*([\d\s.,]+)g/i);
  const nutritionFiberMatch = text.match(/Diyet\s+Lifi:\s*([\d\s.,]+)g/i) || text.match(/D yet\s+L f :\s*([\d\s.,]+)g/i);

  // 8. Tıbbi Ölçümler (Tansiyon, SpO2, Kan Şekeri)
  const bloodPressure: HealthReportData['bloodPressure'] = [];
  // Supports space instead of colon in time (e.g., "12 30 -> Sistolik: 120 | Diastolik: 80")
  const bpRegex = /(\d{2})[\s:]+(\d{2})\s*->\s*Sistolik:\s*(\d+)\s*\|\s*Diastolik:\s*(\d+)(?:\s*\(Nabız:\s*(\d+)\))?/gi;
  let bpMatch;
  while ((bpMatch = bpRegex.exec(text)) !== null) {
    bloodPressure.push({
      time: `${bpMatch[1]}:${bpMatch[2]}`,
      systolic: parseInt(bpMatch[3]),
      diastolic: parseInt(bpMatch[4]),
      pulse: bpMatch[5] ? parseInt(bpMatch[5]) : undefined
    });
  }

  const bloodOxygen: HealthReportData['bloodOxygen'] = [];
  // e.g. "- 23 09 -> % 95"
  const oxygenRegex = /(\d{2})[\s:]+(\d{2})\s*->\s*%\s*(\d+)/gi;
  let oxMatch;
  while ((oxMatch = oxygenRegex.exec(text)) !== null) {
    bloodOxygen.push({
      time: `${oxMatch[1]}:${oxMatch[2]}`,
      spo2: parseInt(oxMatch[3])
    });
  }

  const bloodGlucose: HealthReportData['bloodGlucose'] = [];
  const glucoseRegex = /(\d{2})[\s:]+(\d{2})\s*->\s*(\d+)\s*mg\/dL(?:\s*\(([^\)]+)\))?/gi;
  let glucMatch;
  while ((glucMatch = glucoseRegex.exec(text)) !== null) {
    bloodGlucose.push({
      time: `${glucMatch[1]}:${glucMatch[2]}`,
      glucose: parseInt(glucMatch[3]),
      mealType: glucMatch[4] ? glucMatch[4].trim() : undefined
    });
  }

  const skinTempMatch = text.match(/Ortalama\s+Cilt\s+Sıcaklığı:\s*([\d\s.,]+)\s*°C/i) || text.match(/Ortalama\s+C lt\s+Sıcaklığı:\s*([\d\s.,]+)\s*°C/i);
  const apneaMatch = text.match(/Uyku\s+Apnesi\s+Analizi:\s*([^\n]+)/i) || text.match(/Uyku\s+Apnes\s+Anal z :\s*([^\n]+)/i);

  // 9. Egzersizler (Workout: 57 dk - 645,9 kcal | Mesafe: 4,65 km)
  const workouts: HealthReportData['workouts'] = [];
  const workoutRegex = /•\s*([^:\n]+):\s*(\d+)\s*dk\s*-\s*([\d\s.,]+)\s*kcal(?:\s*\|\s*Mesafe:\s*([\d\s.,]+)\s*km)?/gi;
  let workMatch;
  while ((workMatch = workoutRegex.exec(text)) !== null) {
    const type = workMatch[1].trim();
    if (type.toLowerCase().includes("toplam") || type.toLowerCase().includes("alınan") || type.toLowerCase().includes("ortalama")) {
      continue;
    }
    workouts.push({
      type: type,
      durationMinutes: parseInt(workMatch[2]),
      caloriesBurned: parseFlexibleFloat(workMatch[3]) || 0,
      distanceKm: workMatch[4] ? parseFlexibleFloat(workMatch[4]) : undefined
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
    heightCm: parseFlexibleFloat(heightMatch?.[1]),
    weightKg: parseFlexibleFloat(weightMatch?.[1]),
    steps: totalStepsMatch ? {
      totalSteps: parseInt(totalStepsMatch[1]),
      goalSteps: parseInt(totalStepsMatch[2]),
      distanceKm: parseFlexibleFloat(distanceMatch?.[1]) || 0
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
      totalCalories: parseFlexibleFloat(totalCalMatch[1]) || 0,
      activeCalories: caloriesBreakdownMatch ? parseFlexibleFloat(caloriesBreakdownMatch[1]) || 0 : 0,
      restCalories: caloriesBreakdownMatch ? parseFlexibleFloat(caloriesBreakdownMatch[2]) || 0 : 0
    } : undefined,
    sleep: sleepDurationMatch ? {
      totalDurationMinutes: parseInt(sleepDurationMatch[1]) * 60 + parseInt(sleepDurationMatch[2]),
      sleepScore: sleepScoreMatch ? parseInt(sleepScoreMatch[1]) : undefined,
      startTime: sleepTimesMatch ? `${sleepTimesMatch[1]}:${sleepTimesMatch[2]}` : undefined,
      endTime: sleepTimesMatch ? `${sleepTimesMatch[3]}:${sleepTimesMatch[4]}` : undefined,
      remMinutes: remMatch ? parseInt(remMatch[1]) : 0,
      lightSleepMinutes: lightMatch ? parseInt(lightMatch[1]) : 0,
      deepSleepMinutes: deepMatch ? parseInt(deepMatch[1]) : 0,
      awakeMinutes: awakeMatch ? parseInt(awakeMatch[1]) : 0
    } : undefined,
    waterIntake: waterMatch ? {
      amountMl: parseFlexibleFloat(waterMatch[1]) || 0,
      goalMl: parseFlexibleFloat(waterMatch[2]) || 2000
    } : undefined,
    bodyComposition: bodyWeightMatch ? {
      weightKg: parseFlexibleFloat(bodyWeightMatch[1]) || 0,
      heightCm: bodyHeightMatch ? parseFlexibleFloat(bodyHeightMatch[1]) : undefined,
      bodyFatPercentage: bodyFatMatch ? parseFlexibleFloat(bodyFatMatch[1]) : undefined,
      skeletalMuscleMassKg: skeletalMuscleMatch ? parseFlexibleFloat(skeletalMuscleMatch[1]) : undefined,
      bmi: bmiMatch ? parseFlexibleFloat(bmiMatch[1]) : undefined
    } : undefined,
    nutrition: nutritionCalMatch ? {
      calories: parseFlexibleFloat(nutritionCalMatch[1]) || 0,
      carbsGrams: nutritionMacrosMatch ? parseFlexibleFloat(nutritionMacrosMatch[1]) || 0 : 0,
      proteinGrams: nutritionMacrosMatch ? parseFlexibleFloat(nutritionMacrosMatch[2]) || 0 : 0,
      fatGrams: nutritionMacrosMatch ? parseFlexibleFloat(nutritionMacrosMatch[3]) || 0 : 0,
      fiberGrams: nutritionFiberMatch ? parseFlexibleFloat(nutritionFiberMatch[1]) : undefined
    } : undefined,
    bloodPressure,
    bloodOxygen,
    bloodGlucose,
    skinTemperatureAvg: skinTempMatch ? parseFlexibleFloat(skinTempMatch[1]) : undefined,
    sleepApneaSeverity: apneaMatch ? apneaMatch[1].trim() : undefined,
    workouts
  };
}

function parseTurkishDate(dateStr: string): Date {
  const months: Record<string, number> = {
    'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
    'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
  };
  
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
