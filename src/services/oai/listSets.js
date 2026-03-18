import { SETS } from '../../utils/constants.js';

/**
 * Servicio ListSets - Retorna los sets disponibles
 * @returns {object}
 */
export function listSets() {
  return {
    set: SETS.map(s => ({
      setSpec: s.setSpec,
      setName: s.setName,
    })),
  };
}
