import { DiscourseClozeStats } from '../types/discourseCloze';
import { PlayerProfile } from '../types/stats';

export interface DiscourseFunctionDiagnosis {
  functionCode: string;
  labelEu: string;
  total: number;
  correct: number;
  accuracy: number;
  status:
    | 'no_data'
    | 'indartu_beharra'
    | 'bidean'
    | 'ondo'
    | 'bikain';
  messageEu: string;
}

export interface DiscourseDiagnosis {
  globalStatus:
    | 'no_data'
    | 'starting'
    | 'needs_reinforcement'
    | 'progressing'
    | 'strong'
    | 'excellent';

  mainMessageEu: string;
  secondaryMessageEu?: string;

  weakestFunctions: DiscourseFunctionDiagnosis[];
  strongestFunctions: DiscourseFunctionDiagnosis[];

  recommendedReviewFocus: string[];

  suggestedAction:
    | 'play_first_session'
    | 'review_weak_functions'
    | 'continue_training'
    | 'try_harder_level'
    | 'keep_mastering';

  suggestedActionLabelEu: string;
  suggestedRoute: string;
}

export function getDiscourseFunctionLabelEu(functionCode: string): string {
  const map: Record<string, string> = {
    'ordena': 'Ordena',
    'ondorioa': 'Ondorioa',
    'kausa': 'Kausa',
    'kontrastea': 'Kontrastea',
    'aurkaritza': 'Aurkaritza / kontzesioa',
    'adibidetzea': 'Adibidetzea',
    'gehikuntza': 'Gehikuntza',
    'birformulazioa': 'Birformulazioa',
    'laburpena': 'Laburpena',
    'helburua': 'Helburua',
    'baldintza': 'Baldintza',
    'denbora': 'Denbora',
    'argudio_idazkera': 'Argudio-idazkera',
    'erregistroa': 'Erregistroa',
    'ñabardura': 'Ñabardura'
  };
  return map[functionCode] || (functionCode.charAt(0).toUpperCase() + functionCode.slice(1).replace(/_/g, ' '));
}

export function getFunctionRecommendationEu(functionCode: string): string {
  const map: Record<string, string> = {
    'ondorioa': 'Ondoriozko lokailuak lantzea komeni da: beraz, hortaz, ondorioz edo hori dela eta bezalako formek aurreko ideiatik ondorio bat ateratzen dute.',
    'kontrastea': 'Kontrastezko lokailuak berrikusi: hala ere, aldiz edo ordea bezalako formek aurreko ideiarekin talka edo aldea markatzen dute.',
    'ordena': 'Ordena diskurtsiboa sendotu: lehenik, ondoren, jarraian eta azkenik bezalako formek testuaren egitura antolatzen dute.',
    'gehikuntza': 'Gehikuntza lantzea komeni da: bestalde, gainera edo halaber bezalako formek informazio osagarria gehitzen dute.',
    'aurkaritza': 'Aurkaritza edo kontzesioa bereiztea komeni da: dena den bezalako formek aurrekoa baztertu gabe norabide berri bat ematen diote diskurtsoari.',
    'adibidetzea': 'Adibidetzea lantzea komeni da: adibidez edo esaterako bezalako formek ideia bat adibide bidez argitzen dute.'
  };
  return map[functionCode] || 'Funtzio hau testuinguruan berrikustea komeni da.';
}

export const discourseClozeDiagnosisService = {
  getDiscourseDiagnosis(stats: DiscourseClozeStats, profile: PlayerProfile): DiscourseDiagnosis {
    const { totalAnswers, accuracy, byDiscursiveFunction } = stats;
    const accPct = accuracy * 100;

    let globalStatus: DiscourseDiagnosis['globalStatus'] = 'no_data';
    let mainMessageEu = '';
    let secondaryMessageEu = '';
    let suggestedAction: DiscourseDiagnosis['suggestedAction'] = 'play_first_session';
    let suggestedActionLabelEu = '';
    let suggestedRoute = '/antolatzaileak/play?size=5';

    if (totalAnswers === 0) {
      globalStatus = 'no_data';
      mainMessageEu = 'Oraindik ez dago datu nahikorik.';
      secondaryMessageEu = 'Jokatu lehen saioa antolatzaileen erabilera aztertzen hasteko.';
      suggestedAction = 'play_first_session';
      suggestedActionLabelEu = 'Lehen saioa jokatu';
      suggestedRoute = 'play_5';
    } else if (totalAnswers < 10) {
      globalStatus = 'starting';
      mainMessageEu = 'Hasierako datuak biltzen ari gara.';
      secondaryMessageEu = 'Saio batzuk gehiago jokatzen dituzunean, diagnostikoa zehatzagoa izango da.';
      suggestedAction = 'continue_training';
      suggestedActionLabelEu = 'Entrenatzen jarraitu';
      suggestedRoute = 'play_10';
    } else if (accPct < 60) {
      globalStatus = 'needs_reinforcement';
      mainMessageEu = 'Antolatzaileak indartzea komeni da.';
      secondaryMessageEu = 'Errepasoak lagunduko dizu lokailu bakoitzaren funtzioa hobeto bereizten.';
      suggestedAction = 'review_weak_functions';
      suggestedActionLabelEu = 'Errepasoa hasi';
      suggestedRoute = 'review_10';
    } else if (accPct >= 60 && accPct < 80) {
      globalStatus = 'progressing';
      mainMessageEu = 'Bidean zaude.';
      secondaryMessageEu = 'Funtzio batzuk ondo bereizten hasi zara, baina oraindik badago zer sendotu.';
      suggestedAction = 'continue_training';
      suggestedActionLabelEu = 'Beste saio bat jokatu';
      suggestedRoute = 'play_10';
    } else if (accPct >= 80 && accPct < 90) {
      globalStatus = 'strong';
      mainMessageEu = 'Oinarri sendoa daukazu.';
      secondaryMessageEu = 'Orain ñabardura finagoak lantzea komeni da.';
      suggestedAction = 'try_harder_level';
      suggestedActionLabelEu = 'Erronka jokatu';
      suggestedRoute = 'play_15';
    } else if (accPct >= 90 && totalAnswers >= 20) {
      globalStatus = 'excellent';
      mainMessageEu = 'Bikain ari zara.';
      secondaryMessageEu = 'Antolatzaileen erabilera gero eta zehatzago menderatzen ari zara.';
      suggestedAction = 'keep_mastering';
      suggestedActionLabelEu = 'Maila altuagoko erronka';
      suggestedRoute = 'play_15';
    }

    const functions: DiscourseFunctionDiagnosis[] = Object.entries(byDiscursiveFunction).map(([func, val]) => {
      let status: DiscourseFunctionDiagnosis['status'] = 'no_data';
      let messageEu = 'Oraindik ez dago datu nahikorik.';
      const fAccPct = val.accuracy * 100;

      if (val.total >= 3) {
        if (fAccPct < 60) {
          status = 'indartu_beharra';
          messageEu = 'Funtzio hau berrikustea komeni da.';
        } else if (fAccPct >= 60 && fAccPct < 80) {
          status = 'bidean';
          messageEu = 'Oinarria baduzu, baina erabilera sendotu behar da.';
        } else if (fAccPct >= 80 && fAccPct < 90) {
          status = 'ondo';
          messageEu = 'Ongi bereizten hasi zara.';
        } else {
          status = 'bikain';
          messageEu = 'Oso ondo menderatzen ari zara.';
        }
      }

      return {
        functionCode: func,
        labelEu: getDiscourseFunctionLabelEu(func),
        total: val.total,
        correct: val.correct,
        accuracy: val.accuracy,
        status,
        messageEu
      };
    });

    const validFunctions = functions.filter(f => f.total >= 3);
    
    // sorting lowest to highest
    const weakestFunctions = [...validFunctions]
      .filter(f => f.accuracy < 0.8)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // sorting highest to lowest
    const strongestFunctions = [...validFunctions]
      .filter(f => f.accuracy >= 0.8)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);

    const recommendedReviewFocus = weakestFunctions.map(f => f.functionCode);

    return {
      globalStatus,
      mainMessageEu,
      secondaryMessageEu,
      weakestFunctions,
      strongestFunctions,
      recommendedReviewFocus,
      suggestedAction,
      suggestedActionLabelEu,
      suggestedRoute
    };
  }
};
