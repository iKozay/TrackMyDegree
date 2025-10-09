const DATA = {
  semesters: {
    Fall: 'F',
    Winter: 'W',
    Summer: 'S',
    Exempted: 'E',
  },
  depts: {
    ACCO: 'AA',
    ACTT: 'AB',
    ACTU: 'AC',
    ADED: 'AD',
    AERO: 'AE',
    AHSC: 'AF',
    ANTH: 'AG',
    ARTE: 'AH',
    ARTH: 'AI',
    ARTT: 'AJ',
    ARTX: 'AK',
    BCEE: 'AL',
    BIOL: 'AM',
    BLDG: 'AN',
    BSTA: 'AO',
    BTM: 'AP',
    CART: 'AQ',
    CATA: 'AR',
    CERA: 'AS',
    CHEM: 'AT',
    CIVI: 'AU',
    CLAS: 'AV',
    COEN: 'AW',
    COMM: 'AX',
    COMP: 'AY',
    COMS: 'AZ',
    DANC: 'BA',
    DART: 'BB',
    DRAW: 'BC',
    EAST: 'BD',
    ECON: 'BE',
    EDUC: 'BF',
    ELEC: 'BG',
    ENCS: 'BH',
    ENGL: 'BI',
    ENGR: 'BJ',
    ESL: 'BK',
    EXCI: 'BL',
    FASS: 'BM',
    FBRS: 'BN',
    FFAR: 'BO',
    FINA: 'BP',
    FLIT: 'BQ',
    FMAN: 'BR',
    FMPR: 'BS',
    FMST: 'BT',
    FPST: 'BU',
    FRAA: 'BV',
    FRAN: 'BW',
    FTRA: 'BX',
    GEOG: 'BY',
    GEOL: 'BZ',
    GERM: 'CA',
    HEBR: 'CB',
    HIST: 'CC',
    IADI: 'CD',
    IBUS: 'CE',
    ILBE: 'CF',
    IMCA: 'CG',
    INDU: 'CH',
    INST: 'CI',
    INTE: 'CJ',
    IRST: 'CK',
    ITAL: 'CL',
    JAZZ: 'CM',
    JHIS: 'CN',
    JOUR: 'CO',
    JPER: 'CP',
    KCEP: 'CQ',
    KNBP: 'CR',
    LBCL: 'CS',
    LING: 'CT',
    LOYC: 'CU',
    MACF: 'CV',
    MANA: 'CW',
    MARA: 'CX',
    MARK: 'CY',
    MAST: 'CZ',
    MATH: 'DA',
    MCHI: 'DB',
    MECH: 'DC',
    MHIS: 'DD',
    MIAE: 'DE',
    MPER: 'DF',
    MUSI: 'DG',
    NEUR: 'DH',
    PERC: 'DI',
    PHIL: 'DJ',
    PHOT: 'DK',
    PHYS: 'DL',
    POLI: 'DM',
    PRIN: 'DN',
    PSYC: 'DO',
    PTNG: 'DP',
    RELI: 'DQ',
    SCEN: 'DR',
    SCOL: 'DS',
    SCOM: 'DT',
    SCPA: 'DU',
    SCUL: 'DV',
    SFYX: 'DW',
    SKIL: 'DX',
    SOCI: 'DY',
    SOEN: 'DZ',
    SPAN: 'EA',
    SSDB: 'EB',
    STAT: 'EC',
    STOQ: 'ED',
    TESL: 'EE',
    THEO: 'EF',
    UNSS: 'EG',
    URBS: 'EH',
    WSDB: 'EI',
  },
  courseBase: 100,
  version: 'v1',
};

const EXPAND_DATA = {
  semesters: Object.fromEntries(Object.entries(DATA.semesters).map(([k, v]) => [v, k])),
  depts: Object.fromEntries(Object.entries(DATA.depts).map(([k, v]) => [v, k])),
};

function compressCourseNumber(strNum) {
  const num = parseInt(strNum);
  if (num >= DATA.courseBase && num < DATA.courseBase + 676) {
    const value = num - DATA.courseBase;
    const char1 = String.fromCharCode(97 + Math.floor(value / 26));
    const char2 = String.fromCharCode(97 + (value % 26));
    return char1 + char2;
  }
  return strNum;
}

function decompressCourseNumber(compressedNum) {
  if (compressedNum.length === 2 && /^[a-z]{2}$/.test(compressedNum)) {
    const firstValue = compressedNum.charCodeAt(0) - 97;
    const secondValue = compressedNum.charCodeAt(1) - 97;

    const value = firstValue * 26 + secondValue + DATA.courseBase;

    return value.toString();
  }

  return compressedNum;
}

function decompressTimelineV1(data) {
  const timeline = {};
  var degreeId = '';
  var creditsRequired = 0;
  var isECP = false;

  const parts = data.split(/(?=FW-\d{2})|(?=[FWS]\d{2})|(?=E_)/g);

  // console.log('parts:', parts);

  parts.forEach((compressedSemester) => {
    var courses = '';
    var courseList = [];
    var currentSemester = '';
    if (compressedSemester.includes('-')) {
      courses = compressedSemester.slice(5);
      const currentSeason =
        EXPAND_DATA.semesters[compressedSemester[0]] + '/' + EXPAND_DATA.semesters[compressedSemester[1]];
      const currentYear = '20' + compressedSemester.slice(3, 5);
      currentSemester = currentSeason + ' ' + currentYear;
    } else if (compressedSemester.includes('_')) {
      if (compressedSemester[0] === 'D') {
        const [marker, degree, credits, ecp] = compressedSemester.split('_');
        degreeId = degree;
        creditsRequired = credits;
        isECP = ecp === 1;
        return;
      } else {
        //exempted
        currentSemester = EXPAND_DATA.semesters[compressedSemester[0]];
        courses = compressedSemester.slice(2);
      }
    } else {
      courses = compressedSemester.slice(3);
      const currentSeason = EXPAND_DATA.semesters[compressedSemester[0]];
      const currentYear = '20' + compressedSemester.slice(1, 3);
      currentSemester = currentSeason + ' ' + currentYear;
    }
    // const currentSemester = currentSeason + ' ' + currentYear;
    if (courses.length % 4 !== 0) {
      console.log('error');
      return;
    }
    for (let i = 0; i < courses.length; i += 4) {
      const course = courses.slice(i, i + 4);
      courseList.push(EXPAND_DATA.depts[course.slice(0, 2)] + decompressCourseNumber(course.slice(2)));
    }

    timeline[currentSemester] = courseList;
  });

  return [timeline, degreeId, creditsRequired, isECP];
}

export const compressTimeline = (timeline, degreeId, credits, ecp) => {
  let compressed = 'D_' + degreeId + '_' + credits + '_' + (ecp ? '1' : '0');

  Object.entries(timeline).forEach(([semester, courses]) => {
    let semCode;
    if (semester.includes(' ')) {
      const [season, year] = semester.split(' ');
      const shortYear = year.slice(-2);

      if (season.includes('/')) {
        const [season1, season2] = season.split('/');
        semCode = DATA.semesters[season1] + DATA.semesters[season2] + '-' + shortYear;
      } else {
        semCode = DATA.semesters[season] + shortYear;
      }
    } else {
      semCode = DATA.semesters[semester] + '_';
    }

    const compressedCourses = courses
      .map((course) => {
        const match = course.match(/([A-Z]+)(\d+)/);
        if (!match) return course;

        const [, dept, num] = match;

        const deptCode = DATA.depts[dept] || dept;

        const numCode = compressCourseNumber(num);

        return deptCode + numCode;
      })
      .join('');

    compressed += semCode + compressedCourses;
  });

  return DATA.version + '~' + compressed;
};

export const decompressTimeline = (compressed) => {
  const versionMatch = compressed.match(/^([^~]+)~/);
  if (!versionMatch) {
    console.log('no version');
    return {};
  }

  const version = versionMatch[1];
  const data = compressed.slice(version.length + 1);

  if (version === 'v1') {
    return decompressTimelineV1(data);
  } else {
    console.log('invalid version');
    return {};
  }
};
