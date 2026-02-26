const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an OPNet address format.
 * OPNet testnet uses 'opt' HRP with bech32/bech32m encoding.
 * P2TR (Taproot): opt1p... (~63 chars)
 * P2WPKH: opt1q... (~43 chars)
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'recipients.errors.emptyAddress' };
  }

  const trimmed = address.trim().toLowerCase();

  // Check prefix (opt1p for P2TR, opt1q for P2WPKH)
  if (!trimmed.startsWith('opt1p') && !trimmed.startsWith('opt1q')) {
    return { valid: false, error: 'recipients.errors.invalidPrefix' };
  }

  // Data part is everything after 'opt1'
  const dataPart = trimmed.slice(4);

  if (dataPart.length < 6) {
    return { valid: false, error: 'recipients.errors.tooShort' };
  }

  // Check bech32 charset
  for (const char of dataPart) {
    if (!BECH32_CHARSET.includes(char)) {
      return { valid: false, error: 'recipients.errors.invalidCharacters' };
    }
  }

  // Reasonable length: P2TR ~63, P2WPKH ~43
  if (trimmed.length < 40 || trimmed.length > 100) {
    return { valid: false, error: 'recipients.errors.invalidLength' };
  }

  return { valid: true };
}

/**
 * Validate a recipient amount.
 * Must be a positive number, not zero.
 */
export function validateAmount(amount: string): ValidationResult {
  if (!amount || amount.trim().length === 0) {
    return { valid: false, error: 'recipients.errors.emptyAmount' };
  }

  const trimmed = amount.trim();
  const num = Number(trimmed);

  if (isNaN(num)) {
    return { valid: false, error: 'recipients.errors.invalidAmount' };
  }

  if (num <= 0) {
    return { valid: false, error: 'recipients.errors.nonPositiveAmount' };
  }

  // No more than 18 decimal places
  const parts = trimmed.split('.');
  if (parts.length > 1 && parts[1]!.length > 18) {
    return { valid: false, error: 'recipients.errors.tooManyDecimals' };
  }

  return { valid: true };
}

/**
 * Name resolver registry for future OPNet naming service integration.
 * Third-party resolvers can be registered here to enable ENS-style name→address resolution.
 *
 * Each resolver receives a name string and returns either:
 * - A resolved address string (e.g. 'opt1p...')
 * - null if the name is not recognized by this resolver
 *
 * Resolvers are tried in registration order; the first non-null result wins.
 */
export type NameResolver = (name: string) => Promise<string | null>;

const nameResolvers: NameResolver[] = [];

export function registerNameResolver(resolver: NameResolver): void {
  nameResolvers.push(resolver);
}

/**
 * Attempt to resolve a human-readable name to an OPNet address.
 * Tries registered name resolvers in order. If none resolve the name,
 * returns the input as-is (validated downstream by validateAddress).
 *
 * This is the hook point for future OPNet naming service integration.
 * When a naming service becomes available, register a resolver via
 * registerNameResolver() and names will be resolved transparently.
 */
export async function resolveAddress(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // If it already looks like a valid address, skip resolution
  if (trimmed.toLowerCase().startsWith('opt1p') || trimmed.toLowerCase().startsWith('opt1q')) {
    return trimmed;
  }

  // Try registered name resolvers
  for (const resolver of nameResolvers) {
    try {
      const resolved = await resolver(trimmed);
      if (resolved) return resolved;
    } catch {
      // Resolver failed — continue to next one silently
    }
  }

  // No resolver could resolve — return as-is (validateAddress will catch invalid format)
  return trimmed;
}

/**
 * Validate an address, attempting name resolution first.
 * Returns the resolved address alongside the validation result.
 * Non-address strings that can't be resolved show a friendly 'Invalid address' error.
 */
export async function resolveAndValidateAddress(
  input: string,
): Promise<ValidationResult & { resolvedAddress: string }> {
  const resolved = await resolveAddress(input);
  const result = validateAddress(resolved);
  return { ...result, resolvedAddress: resolved };
}
