import input from './batch-content.json';
import { titleOnly } from './title-contract.mjs';
/** Same whitelist and consumer constraints as pre-generation; never arbitrary props/source. */
export const batchContent = Object.freeze(titleOnly(input));
