const PLANT_ID_API_KEY = process.env.EXPO_PUBLIC_PLANT_ID_API_KEY!;
const PLANT_ID_BASE_URL = 'https://api.plant.id/v3';

export interface PlantIdentification {
  name: string;
  scientificName: string;
  commonNames: string[];
  probability: number;
  description: string;
  // Watering recommendations
  wateringInterval: number; // days
  waterAmount: number; // ml
  // Seasonal multipliers (derived from plant type)
  seasonMultipliers: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
  rawData: unknown;
}

export interface PlantIdError {
  code: 'network_error' | 'api_error' | 'no_plant_found' | 'limit_exceeded';
  message: string;
}

/**
 * Converts image URI to base64
 */
async function imageUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Derives watering recommendations based on plant classification
 * In a production app these would come from a more detailed plant database
 */
function deriveWateringInfo(suggestion: any): {
  wateringInterval: number;
  waterAmount: number;
  seasonMultipliers: PlantIdentification['seasonMultipliers'];
} {
  // Default conservative values
  const defaults = {
    wateringInterval: 7,
    waterAmount: 200,
    seasonMultipliers: { spring: 1.0, summer: 0.8, autumn: 1.2, winter: 1.5 },
  };

  // Use plant.id's watering details if available
  const details = suggestion?.details;
  if (!details) return defaults;

  const watering = details.watering;
  if (watering) {
    const min = watering.min ?? 7;
    const max = watering.max ?? 14;
    defaults.wateringInterval = Math.round((min + max) / 2);
  }

  return defaults;
}

/**
 * Identifies a plant from an image URI using Plant.id API
 */
export async function identifyPlant(
  imageUri: string
): Promise<PlantIdentification | PlantIdError> {
  try {
    const base64Image = await imageUriToBase64(imageUri);

    const response = await fetch(`${PLANT_ID_BASE_URL}/identification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': PLANT_ID_API_KEY,
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${base64Image}`],
        similar_images: false,
        plant_details: [
          'common_names',
          'description',
          'watering',
          'best_watering',
        ],
        plant_language: 'da', // Danish descriptions when available
      }),
    });

    if (response.status === 429) {
      return { code: 'limit_exceeded', message: 'Du har nået din månedlige grænse for scanninger.' };
    }

    if (!response.ok) {
      return { code: 'api_error', message: `Plant.id API fejl: ${response.status}` };
    }

    const data = await response.json();
    const suggestions = data?.result?.classification?.suggestions;

    if (!suggestions || suggestions.length === 0) {
      return { code: 'no_plant_found', message: 'Ingen plante fundet. Prøv med et klarere billede.' };
    }

    const best = suggestions[0];
    const wateringInfo = deriveWateringInfo(best);

    return {
      name: best.name ?? 'Ukendt plante',
      scientificName: best.name ?? '',
      commonNames: best.details?.common_names ?? [],
      probability: Math.round((best.probability ?? 0) * 100),
      description: best.details?.description?.value ?? '',
      ...wateringInfo,
      rawData: data,
    };
  } catch (error) {
    console.error('Plant.id error:', error);
    return { code: 'network_error', message: 'Netværksfejl. Tjek din internetforbindelse.' };
  }
}

export function isPlantIdError(result: PlantIdentification | PlantIdError): result is PlantIdError {
  return 'code' in result;
}
