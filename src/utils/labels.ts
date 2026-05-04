export function getCategoryLabel(value: string | null | undefined): string {
  if (!value) return '';
  switch (value.toLowerCase()) {
    case 'komunikazioa': return 'Komunikazioa';
    case 'balorazioa': return 'Balorazioa';
    case 'pentsamendua': return 'Pentsamendua';
    case 'gizartea': return 'Gizartea';
    case 'gorputza_pertzepzioa': return 'Gorputza eta pertzepzioa';
    case 'natura_egunerokoa': return 'Natura eta egunerokoa';
    case 'denbora_espazioa': return 'Denbora eta espazioa';
    case 'ekintzak': return 'Ekintzak';
    case 'emozioak': return 'Emozioak';
    case 'ikaskuntza_gaitasuna': return 'Ikaskuntza eta gaitasuna';
    case 'egoera_fisikoa': return 'Egoera fisikoa';
    case 'esperientzia_negatiboa': return 'Esperientzia negatiboa';
    case 'kokapena_eta_babesa': return 'Kokapena eta babesa';
    case 'komunikazioa_eta_administrazioa': return 'Komunikazioa eta administrazioa';
    case 'diskurtsoa': return 'Diskurtsoa';
    case 'egoera': return 'Egoera';
    case 'kantitatea_modua': return 'Kantitatea eta modua';
    case 'izaera': return 'Izaera';
    case 'all_categories': return 'Kategoria guztiak';
    default: return humanizeInternalCode(value);
  }
}

export function getReviewStatusLabel(value: string | null | undefined): string {
  if (!value) return '';
  switch (value.toLowerCase()) {
    case 'reviewed_safe': return 'Segurua';
    case 'reviewed_context_needed': return 'Testuingurua behar du';
    case 'reviewed_register_sensitive': return 'Erregistroari lotua';
    case 'disabled_for_game': return 'Jokotik kanpo';
    case 'needs_external_check': return 'Kanpo egiaztapena behar du';
    case 'pending': return 'Zain';
    case 'needs_review': return 'Berrikusteko';
    case 'all_statuses': return 'Egoera guztiak';
    default: return humanizeInternalCode(value);
  }
}

export function getGrammarLabel(value: string | null | undefined): string {
  if (!value) return '';
  switch (value.toLowerCase()) {
    case 'aditza': return 'Aditza';
    case 'izena': return 'Izena';
    case 'adjektiboa': return 'Adjektiboa';
    case 'adberbioa': return 'Adberbioa';
    case 'lokailua': return 'Lokailua';
    case 'esapidea': return 'Esapidea';
    case 'aditz_esapidea': return 'Aditz-esapidea';
    case 'denbora_adberbioa': return 'Denbora-adberbioa';
    case 'postposizio_egitura': return 'Postposizio-egitura';
    case 'all_grammar': return 'Gramatika mota guztiak';
    default: return humanizeInternalCode(value);
  }
}

export function getQuestionTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  switch (value.toLowerCase()) {
    case 'direct_synonym': return 'Sinonimo zuzena';
    case 'context_synonym': return 'Testuinguruko sinonimoa';
    case 'register_question': return 'Erregistro galdera';
    case 'intensity_question': return 'Intentsitate galdera';
    default: return humanizeInternalCode(value);
  }
}

export function getLevelLabel(value: string | null | undefined): string {
  if (!value) return '';
  if (value === 'all_levels') return 'Maila guztiak';
  // Levels are usually kept as is, but we handle it just in case
  if (['B1', 'B2', 'C1', 'C2'].includes(value.toUpperCase())) {
    return value.toUpperCase();
  }
  return humanizeInternalCode(value);
}

export function getConceptLabel(value: string | null | undefined): string {
  return humanizeInternalCode(value);
}

export function getFilterLabel(value: string | null | undefined): string {
  if (!value) return '';
  switch (value.toLowerCase()) {
    case 'all_categories': return 'Kategoria guztiak';
    case 'all_statuses': return 'Egoera guztiak';
    case 'all_levels': return 'Maila guztiak';
    case 'all_grammar': return 'Gramatika mota guztiak';
    default: return humanizeInternalCode(value);
  }
}

export function humanizeInternalCode(value: string | null | undefined): string {
  if (!value) return '';
  // Convert to lowercase
  let str = value.toLowerCase();
  
  // Replace underscores with spaces
  str = str.replace(/_/g, ' ');
  
  // Replace " edo " or " eta " correctly to not capitalize them if we capitalize words, but let's just capitalize the first letter globally
  // Wait, requirement: "capitalizar primera letra de cada palabra importante" or just first letter?
  // "sustituir "_" por espacios, sustituir " eta " si ya existe correctamente, capitalizar primera letra de cada palabra importante"
  // "kopurua_edo_intentsitatea_jaistea → Kopurua edo intentsitatea jaistea"
  // Wait, the example only capitalizes the *first* letter of the entire concept string:
  // "kopurua_edo_intentsitatea_jaistea → Kopurua edo intentsitatea jaistea"
  // Let's just capitalize the first character.
  return str.charAt(0).toUpperCase() + str.slice(1);
}
