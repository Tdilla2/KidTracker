/**
 * Validates if a zip code matches the provided city and state
 * Uses the Zippopotam.us API for validation
 */
export interface ZipCodeValidationResult {
  isValid: boolean;
  message?: string;
  suggestedCity?: string;
  suggestedState?: string;
}

export async function validateZipCode(
  zipCode: string,
  city: string,
  state: string
): Promise<ZipCodeValidationResult> {
  // Clean inputs
  const cleanZip = zipCode.trim();
  const cleanCity = city.trim().toLowerCase();
  const cleanState = state.trim().toUpperCase();

  // Basic validation
  if (!cleanZip || !cleanCity || !cleanState) {
    return {
      isValid: true, // Allow empty to be handled by required fields
    };
  }

  // Validate zip code format (5 digits)
  if (!/^\d{5}$/.test(cleanZip)) {
    return {
      isValid: false,
      message: "ZIP code must be 5 digits",
    };
  }

  // Validate state format (2 letters)
  if (!/^[A-Z]{2}$/.test(cleanState)) {
    return {
      isValid: false,
      message: "State must be 2 letters (e.g., CA, NY, TX)",
    };
  }

  try {
    // Call the Zippopotam API
    const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          isValid: false,
          message: `ZIP code ${cleanZip} not found. Please verify the ZIP code is correct.`,
        };
      }
      // If API is down, allow submission with warning
      console.warn("Zip code validation API error:", response.status);
      return {
        isValid: true,
      };
    }

    const data = await response.json();

    // The API returns places array with city and state information
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      const apiCity = place["place name"].toLowerCase();
      const apiState = place["state abbreviation"].toUpperCase();

      // Check if state matches
      if (apiState !== cleanState) {
        return {
          isValid: false,
          message: `ZIP code ${cleanZip} is in ${apiState}, not ${cleanState}. Did you mean ${place["place name"]}, ${apiState}?`,
          suggestedCity: place["place name"],
          suggestedState: apiState,
        };
      }

      // Check if city matches (allow partial matches)
      if (!apiCity.includes(cleanCity) && !cleanCity.includes(apiCity)) {
        return {
          isValid: false,
          message: `ZIP code ${cleanZip} is for ${place["place name"]}, ${apiState}, not ${city}. Did you mean ${place["place name"]}?`,
          suggestedCity: place["place name"],
          suggestedState: apiState,
        };
      }

      // Everything matches!
      return {
        isValid: true,
      };
    }

    // No data returned, allow with warning
    return {
      isValid: true,
    };
  } catch (error) {
    // If API fails, log error but allow submission
    console.warn("Zip code validation error:", error);
    return {
      isValid: true,
    };
  }
}
