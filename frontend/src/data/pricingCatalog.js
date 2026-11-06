/** Falcon Revive service price list (AED) — from backend/pricing.txt */

export const MAIN_SERVICES = [
  { id: 'pdr', label: 'Paintless Dent Repair (PDR)' },
  { id: 'pdr_extra', label: 'Additional PDR Charges' },
  { id: 'body_package', label: 'Body & Paint Package' },
  { id: 'panel_paint', label: 'Body Panel Painting' },
  { id: 'plastic_trim', label: 'Plastic & Trim Parts' },
  { id: 'extra', label: 'Extra Services' },
  { id: 'rims', label: 'Rims & Calipers' },
  { id: 'detailing', label: 'Detailing Services' },
  { id: 'custom', label: 'Custom / Manual line' },
];

export const VEHICLE_TYPES_PACKAGE = [
  { id: 'hatchback', label: 'Hatchback / Small Car', price: 3600 },
  { id: 'sedan', label: 'Sedan', price: 4000 },
  { id: 'suv', label: 'SUV / Crossover', price: 4600 },
  { id: 'large_suv', label: 'Large SUV', price: 5300 },
  { id: 'pickup', label: 'Pickup Truck', price: 4800 },
  { id: 'van', label: 'Van / Minivan', price: 5100 },
];

/** Used by categories that have SUV vs Sedan columns */
export const VEHICLE_TYPES_SUV_SEDAN = [
  { id: 'suv', label: 'SUV' },
  { id: 'sedan', label: 'Sedan' },
];

const PDR_SIZES = [
  { id: '1-5', label: '1cm - 5cm', price: 199 },
  { id: '6-10', label: '6cm - 10cm', price: 299 },
  { id: '11-15', label: '11cm - 15cm', price: 399 },
  { id: '16-20', label: '16cm - 20cm', price: 549 },
  { id: '21-30', label: '21cm - 30cm', price: 699 },
  { id: '31-40', label: '31cm - 40cm', price: 899 },
  { id: '41-50', label: '41cm - 50cm', price: 999 },
];

const PDR_EXTRAS = [
  { id: 'interior_dismantle', label: 'Interior Panel Dismantle', price: 89 },
  {
    id: 'full_panel_removal',
    label: 'Full Panel Removal & Fixing + Computer Reprogramming',
    price: 250,
  },
  {
    id: 'cutting_polishing',
    label: 'After Denting Cutting & Polishing (Per Panel)',
    price: 50,
  },
  { id: 'brush_touchup', label: 'Brush Touch-Up Paint', price: 50 },
  {
    id: 'bumper_clip',
    label: 'Bumper Clip Fixing and Alignment',
    price: 199,
  },
  { id: 'panel_fitting', label: 'Panel Fitting', price: 199 },
  {
    id: 'roof_ceiling',
    label: 'Roof Ceiling Dent Access - Removing & Fixing',
    price: 299,
  },
];

/** Dual price: { suv, sedan } */
const PANEL_PAINT = [
  { id: 'hood', label: 'Hood / Bonnet', suv: 750, sedan: 600 },
  { id: 'front_fender', label: 'Front Fender (One Side)', suv: 500, sedan: 400 },
  { id: 'front_door', label: 'Front Door (One Side)', suv: 550, sedan: 400 },
  { id: 'rear_door', label: 'Rear Door (One Side)', suv: 550, sedan: 400 },
  { id: 'quarter', label: 'Quarter Panel (One Side)', suv: 650, sedan: 400 },
  { id: 'roof', label: 'Roof', suv: 1000, sedan: 800 },
  { id: 'trunk', label: 'Trunk Lid / Tailgate', suv: 500, sedan: 400 },
  { id: 'front_bumper', label: 'Front Bumper', suv: 700, sedan: 600 },
  { id: 'rear_bumper', label: 'Rear Bumper', suv: 650, sedan: 600 },
];

const PLASTIC_TRIM = [
  { id: 'side_mirror', label: 'Side Mirror (Each)', suv: 99, sedan: 99 },
  { id: 'door_handle', label: 'Door Handle (Each)', suv: 50, sedan: 50 },
  { id: 'front_grille', label: 'Front Grille (Black Paint)', suv: 350, sedan: 300 },
  { id: 'side_skirt', label: 'Side Skirt (One Side)', suv: 370, sedan: 330 },
  { id: 'fender_flare', label: 'Fender Flare (One Side)', suv: 350, sedan: 300 },
];

const EXTRA_SERVICES = [
  { id: 'fuel_door', label: 'Fuel Door', suv: 150, sedan: 150 },
  { id: 'full_emblem', label: 'Full Emblem', suv: 250, sedan: 200 },
  {
    id: 'matte_trims',
    label: 'All Matte Black Exterior Trims',
    suv: 650,
    sedan: 600,
  },
];

const RIMS_CALIPERS = [
  { id: 'rim_1', label: '1 Rim Repaint', suv: 300, sedan: 250 },
  { id: 'rim_4', label: '4 Rims Repaint', suv: 800, sedan: 800 },
  { id: 'caliper_1', label: '1 Caliper Repaint', suv: 300, sedan: 300 },
  { id: 'caliper_4', label: '4 Calipers Repaint', suv: 650, sedan: 600 },
];

const DETAILING = [
  {
    id: 'headlight',
    label: 'Headlight Restoration (2 PCS)',
    suv: 399,
    sedan: 350,
  },
  {
    id: 'diamond_polish',
    label: 'Full Diamond Polish (3 Stage Polish)',
    suv: 650,
    sedan: 600,
  },
  { id: 'engine', label: 'Engine Detailing', suv: 300, sedan: 250 },
  {
    id: 'interior_deep',
    label: 'Interior Deep Detailing - Flooring Shampoo & Steam',
    suv: 549,
    sedan: 499,
  },
];

export function categoryNeedsVehicle(categoryId) {
  return [
    'body_package',
    'panel_paint',
    'plastic_trim',
    'extra',
    'rims',
    'detailing',
  ].includes(categoryId);
}

export function categoryUsesSuvSedan(categoryId) {
  return [
    'panel_paint',
    'plastic_trim',
    'extra',
    'rims',
    'detailing',
  ].includes(categoryId);
}

export function getVehicleOptions(categoryId) {
  if (categoryId === 'body_package') return VEHICLE_TYPES_PACKAGE;
  if (categoryUsesSuvSedan(categoryId)) return VEHICLE_TYPES_SUV_SEDAN;
  return [];
}

export function getOptionList(categoryId) {
  switch (categoryId) {
    case 'pdr':
      return PDR_SIZES;
    case 'pdr_extra':
      return PDR_EXTRAS;
    case 'panel_paint':
      return PANEL_PAINT;
    case 'plastic_trim':
      return PLASTIC_TRIM;
    case 'extra':
      return EXTRA_SERVICES;
    case 'rims':
      return RIMS_CALIPERS;
    case 'detailing':
      return DETAILING;
    case 'body_package':
      return VEHICLE_TYPES_PACKAGE.map((v) => ({
        id: v.id,
        label: v.label,
        price: v.price,
      }));
    default:
      return [];
  }
}

/**
 * Resolve selected dropdowns into description + unit price.
 * @returns {{ description: string, unit_price: number, unit: string } | null}
 */
export function resolvePricing(categoryId, vehicleId, optionId) {
  const category = MAIN_SERVICES.find((c) => c.id === categoryId);
  if (!category || categoryId === 'custom') return null;

  if (categoryId === 'pdr') {
    const opt = PDR_SIZES.find((o) => o.id === optionId);
    if (!opt) return null;
    return {
      description: `PDR — Dent size ${opt.label}`,
      unit_price: opt.price,
      unit: 'Job',
    };
  }

  if (categoryId === 'pdr_extra') {
    const opt = PDR_EXTRAS.find((o) => o.id === optionId);
    if (!opt) return null;
    return {
      description: `PDR Extra — ${opt.label}`,
      unit_price: opt.price,
      unit: 'Job',
    };
  }

  if (categoryId === 'body_package') {
    const opt = VEHICLE_TYPES_PACKAGE.find((o) => o.id === optionId || o.id === vehicleId);
    if (!opt) return null;
    return {
      description: `Body & Paint Package — ${opt.label}`,
      unit_price: opt.price,
      unit: 'Job',
    };
  }

  const dualLists = {
    panel_paint: PANEL_PAINT,
    plastic_trim: PLASTIC_TRIM,
    extra: EXTRA_SERVICES,
    rims: RIMS_CALIPERS,
    detailing: DETAILING,
  };
  const list = dualLists[categoryId];
  if (!list) return null;

  const opt = list.find((o) => o.id === optionId);
  if (!opt || !vehicleId) return null;
  const price = vehicleId === 'sedan' ? opt.sedan : opt.suv;
  const vehicleLabel = vehicleId === 'sedan' ? 'Sedan' : 'SUV';
  return {
    description: `${category.label} — ${opt.label} (${vehicleLabel})`,
    unit_price: price,
    unit: 'Job',
  };
}
