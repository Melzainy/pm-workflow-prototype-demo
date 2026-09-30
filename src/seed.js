// ILLUSTRATIVE demonstration data. Every date, estimate, assignment and hour below is
// example data for testing the interface. None of it describes a real project.

export const DEMO_TODAY = '2026-09-28'; // Monday of W40: the prototype's fixed 'today'
export const HOLIDAYS = ['2026-05-25', '2026-07-03', '2026-09-07', '2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01', '2027-05-31', '2027-07-05'];

// ── Directory ───────────────────────────────────────────────────────────────
export const TEAMS = [
  { id: 'arch', name: 'Architecture', disc: 'arch' },
  { id: 'int', name: 'Interior Design', disc: 'int' },
  { id: 'bim', name: 'Technical / BIM Heroes', disc: 'bim' },
  { id: 'civ', name: 'Civil', disc: 'civ' },
  { id: 'str', name: 'Structural', disc: 'str' },
  { id: 'mep', name: 'MEP', disc: 'mep' },
  { id: 'mgmt', name: 'Project management', disc: 'pm' },
  { id: 'ext', name: 'External reviewers', disc: 'ext' },
];
// cap = illustrative standard weekly capacity (h). caps = dated capacity periods. capVerified stays false until confirmed.
const P = (id, name, teams, note = '', cap = 40) => ({ id, name, teams, note, cap, caps: [{ hpw: cap, from: '2026-01-01', to: null }], capVerified: false, active: true, kind: 'person' });
export const PEOPLE = [
  P('mansour', 'Mansour', ['arch']), P('hossam', 'Hossam B', ['arch']), P('ahmeds', 'Ahmed S', ['arch']), P('ahmedm', 'Ahmed M', ['arch']), P('manuel', 'Manuel', ['arch']),
  P('mai', 'Mai', ['int']), P('hannah', 'Hannah', ['int']), P('lara', 'Lara', ['int'], '', 24), P('jocelyn', 'Jocelyn', ['int'], 'Cabinetry Design'),
  P('mohit', 'Mohit', ['bim']), P('parvez', 'Parvez', ['bim']), P('vandana', 'Vandana', ['bim']), P('satendra', 'Satendra', ['bim']), P('muhammedj', 'Muhammed J', ['bim']),
  P('anees', 'Anees', ['civ']), P('reilly', 'Reilly', ['civ']),
  P('ali', 'Ali', ['str']), P('jared', 'Jared', ['str'], 'MWF Framing'),
  P('kiran', 'Kiran', ['mep']),
  { ...P('extrev', 'External Reviewer', ['ext'], 'final package reviewer', 0), external: true },
];
// Configurable roles. null = not yet assigned (shown as TBD). Assigning a person makes
// role-owned work appear in that person's My Work.
export const ROLE_DEFS = [
  ['pm', 'Project Manager'], ['bim', 'BIM Manager'], ['arch', 'Architecture Lead'], ['int', 'Interior Lead'],
  ['str', 'Structural Lead'], ['mep', 'MEP Lead'], ['civ', 'Civil Lead'], ['mfg', 'Manufacturing Lead'],
  ['exec', 'Executive Management'], ['ext', 'External Reviewer'], ['geo', 'Geotechnical consultant'], ['surv', 'Surveyor'], ['client', 'Client'],
];
export const ROLE_ASSIGN = { pm: null, bim: null, arch: null, int: null, str: null, mep: null, civ: null, mfg: null, exec: null, ext: 'extrev', geo: null, surv: null, client: null };
export const DISC_NAMES = { arch: 'Architecture', int: 'Interior', bim: 'BIM', civ: 'Civil', str: 'Structural', mep: 'MEP', mfg: 'Manufacturing', pm: 'Project management', ext: 'External review' };

// ── Structure builder ───────────────────────────────────────────────────────
// T(local, type, title, owner, opts). owner = person id or 'role:<key>'.
const T = (local, type, title, owner, o = {}) => ({ local, type, title, owner, ...o });
const G = (g, items) => ({ g, items });

export const STRUCTURE = [
  { title: 'Conceptual Design & Contract Signing', gate: 'Authorisation to proceed', wps: [
    ['Client information & land due diligence', [
      T('1', 'task', 'Initial client contact', 'role:pm', { disc: 'pm', w: 5, est: 4, ps: '2026-09-14', pf: '2026-09-14', pct: 100, af: '2026-09-14', outputs: ['Completed land form + design form'] }),
      T('2', 'task', 'Land due diligence report', 'role:civ', { disc: 'civ', w: 8, est: 64, ps: '2026-09-14', pf: '2026-09-25', bs: '2026-09-14', bf: '2026-09-18', contrib: ['anees', 'reilly', 'role:arch'],
        outputs: ['Coordinated Land Due Diligence Report', 'Missing-information register'],
        criteria: 'Report issued with every section covered or listed in the missing-information register.',
        sub: [
          G('Property & planning', [{ t: 'Property boundary and legal survey', owner: 'role:surv', done: true }, { t: 'Zoning classification and development restrictions', owner: 'anees', done: true },
            { t: 'Building setbacks and preliminary building envelope', owner: 'role:arch', done: true }, { t: 'Maximum height and permitted lot coverage', owner: 'role:arch', done: true },
            { t: 'Easements, rights-of-way and access restrictions', owner: 'anees' }, { t: 'Lakefront and environmental restrictions', owner: 'anees' }]),
          G('Existing site conditions', [{ t: 'Topographic survey and existing site elevations', owner: 'role:surv' }, { t: 'Existing structures, retaining walls, vegetation and drainage features', owner: 'reilly', done: true },
            { t: 'Preliminary proposed Finished Floor Elevation (FFE), main level', owner: 'role:arch' }, { t: 'FFE relationship to natural grade, driveway and foundation elevations', owner: 'role:arch' }]),
          G('Geotechnical & groundwater', [{ t: 'Available geotechnical report', owner: 'role:geo' }, { t: 'Preliminary soil-bearing information', owner: 'role:geo' },
            { t: 'Recorded and seasonal high groundwater level, if available', owner: 'role:geo' }, { t: 'Basement, excavation and foundation constraints', owner: 'role:str' },
            { t: 'Missing geotechnical information needing investigation', owner: 'role:geo' }]),
          G('Utilities & infrastructure', [{ t: 'Public water service availability and connection points', owner: 'anees', done: true }, { t: 'Sanitary sewer availability and proposed connection', owner: 'anees' },
            { t: 'Septic-system feasibility (only if applicable)', owner: 'anees', req: 'conditional' }, { t: 'Electrical service availability, capacity and connection location', owner: 'reilly' },
            { t: 'Gas availability and preliminary connection', owner: 'reilly' }, { t: 'Telecommunications connections', owner: 'reilly' },
            { t: 'Underground and overhead utility locations', owner: 'reilly' }, { t: 'Utility crossings, easements and conflicts with the building', owner: 'anees' },
            { t: 'Preliminary service-routing strategy', owner: 'role:civ' }]),
          G('Drainage, environment & construction access', [{ t: 'Existing and proposed drainage patterns', owner: 'reilly' }, { t: 'Preliminary stormwater management requirements', owner: 'anees' },
            { t: 'Floodplain, wetland, shoreline and soil-erosion considerations', owner: 'anees' }, { t: 'Driveway access and preliminary grading', owner: 'reilly' },
            { t: 'Modular delivery and crane access constraints', owner: 'role:mfg' }]),
        ] }),
      T('3', 'task', 'Client brief & inspiration deck', 'role:pm', { disc: 'pm', w: 7, est: 12, ps: '2026-09-15', pf: '2026-09-16', pct: 100, af: '2026-09-16' }),
    ]],
    ['Internal project initiation', [
      T('4', 'task', 'Client confirmation email & call scheduling', 'role:pm', { disc: 'pm', w: 3, est: 2, ps: '2026-09-16', pf: '2026-09-16', pct: 100, af: '2026-09-16', deps: ['1.1', '1.3'] }),
      T('5', 'meeting', 'Internal team touch base', 'role:pm', { disc: 'pm', w: 4, est: 4, ps: '2026-09-16', pf: '2026-09-16', pct: 100, af: '2026-09-16', minutes: true }),
      T('6', 'meeting', 'Client introductory call & conceptual direction', 'role:pm', { disc: 'pm', w: 6, est: 6, ps: '2026-09-17', pf: '2026-09-17', pct: 100, af: '2026-09-17', minutes: true, deps: ['1.5'] }),
    ]],
    ['Conceptual architectural design', [
      T('7', 'task', 'Conceptual floor plan', 'hossam', { disc: 'arch', w: 14, est: 60, ps: '2026-09-17', pf: '2026-09-30', bs: '2026-09-17', bf: '2026-09-25', contrib: ['ahmeds'], deps: ['1.6'], sheets: ['A-101', 'A-102'],
        sub: [{ t: 'Lowest-level plan', owner: 'hossam', done: true }, { t: 'First floor plan', owner: 'hossam', done: true }, { t: 'Module break lines shown', owner: 'ahmeds' }], outputs: ['Conceptual floor plan PDF'] }),
      T('8', 'task', 'Exterior elevations', 'ahmedm', { disc: 'arch', w: 10, est: 40, ps: '2026-09-21', pf: '2026-10-02', pct: 50, contrib: ['mansour'], deps: ['1.7'], sheets: ['A-201', 'A-202'] }),
      T('9', 'task', 'Exterior AI render shots', 'manuel', { disc: 'arch', w: 8, est: 24, ps: '2026-09-18', pf: '2026-09-23', pct: 40, deps: ['1.7', '1.8'] }),
    ]],
    ['Conceptual interior design', [T('10', 'task', 'Interior AI render shots', 'mai', { disc: 'int', w: 8, est: 32, ps: '2026-09-22', pf: '2026-10-01', pct: 50, contrib: ['hannah'], deps: ['1.7'] })]],
    ['Initial cost estimation', [T('11', 'task', 'Initial cost estimate', 'role:pm', { disc: 'pm', w: 7, est: 16, ps: '2026-09-24', pf: '2026-10-02', pct: 30 })]],
    ['Client presentation & feedback', [
      T('14', 'task', 'Prepare conceptual design package', 'role:pm', { disc: 'pm', w: 4, est: 12, ps: '2026-10-05', pf: '2026-10-07', deps: ['1.7', '1.8', '1.9', '1.10', '1.11'] }),
      T('18', 'meeting', 'Concept package internal review', 'role:pm', { disc: 'pm', w: 0, est: 4, ps: '2026-10-08', pf: '2026-10-08', deps: ['1.14'] }),
      T('15', 'meeting', 'Client presentation & approval meeting', 'role:pm', { disc: 'pm', w: 3, est: 6, ps: '2026-10-09', pf: '2026-10-09', deps: ['1.18'] }),
    ]],
    ['Conceptual design finalisation', [T('16', 'review', 'Internal review + client follow-up', 'role:pm', { disc: 'pm', w: 2, est: 4, ps: '2026-10-12', pf: '2026-10-13', deps: ['1.15'] })]],
    ['Client approval & contract signing', [
      T('12', 'signoff', 'Material selection list, signed by client', 'role:int', { disc: 'int', w: 5, est: 2, ps: '2026-10-12', pf: '2026-10-14', deps: ['1.15'], doc: 'Signed_Material_Selection_List.pdf' }),
      T('13', 'signoff', 'Appliance selection list, signed by client', 'role:int', { disc: 'int', w: 5, est: 2, ps: '2026-10-12', pf: '2026-10-14', deps: ['1.15'], doc: 'Signed_Appliance_Selection_List.pdf' }),
      T('17', 'signoff', 'Executed contract for Phase 02', 'role:pm', { disc: 'pm', w: 1, est: 2, ps: '2026-10-15', pf: '2026-10-16', deps: ['1.16'], doc: 'Executed_Contract_Phase02.pdf' }),
    ]],
  ] },

  { title: 'Design Development & Design Freeze', gate: 'Client-signed Design Freeze', wps: [
    ['BIM setup & design criteria', [
      T('0A', 'task', 'BIM project setup: concept layout to Revit transfer', 'role:bim', { disc: 'bim', w: 6, est: 40, ps: '2026-10-19', pf: '2026-10-23',
        outputs: ['Validated Revit model', 'BIM setup and model validation checklist', 'Confirmed Revit Master Template', 'ACC access and permissions register', 'Modeling and coordination instructions'],
        sub: ['Receive and verify the approved concept layout and revision', 'Transfer the design to Revit using the designated transfer workflow', 'Validate imported geometry and model completeness',
          'Confirm building levels and reference coordinates', 'Apply the company Revit Master Template', 'Verify view templates, sheet sets, schedules, families and parameters',
          'Configure the project browser and naming conventions', 'Establish the linked-model and model-sharing strategy', 'Configure ACC folders and project permissions',
          'Assign Architecture, Interior, Structural, MEP and Manufacturing access', 'Verify the publishing and model coordination workflow', 'Issue the Revit Design Development model'] }),
      T('0B', 'task', 'Applicable codes & design criteria', 'role:arch', { disc: 'arch', w: 5, est: 32, ps: '2026-10-19', pf: '2026-10-30', contrib: ['role:str', 'role:mep'],
        outputs: ['Project code & design criteria report', 'Architectural code checklist', 'Preliminary structural design criteria', 'Preliminary MEP design criteria', 'Building envelope / energy requirements', 'Open regulatory questions register'],
        sub: ['Confirm jurisdiction and applicable residential code editions', 'Research dimensional requirements: rooms, ceilings, stairs, guards, egress', 'Verify zoning and building-envelope restrictions',
          'Establish preliminary wall, roof and floor insulation requirements', 'Identify mechanical, plumbing and electrical requirements', 'Establish preliminary structural design criteria',
          'Establish preliminary mechanical and electrical design criteria', 'Record local site and utility requirements', 'Identify missing regulatory information',
          'Document official sources, verification dates and reviewers'] }),
    ]],
    ['Coordination meetings', [
      T('M1', 'meeting', 'DD kickoff', 'role:pm', { disc: 'pm', w: 0, est: 8, ps: '2026-10-19', pf: '2026-10-19' }),
      T('M2', 'meeting', 'Weekly design sync (recurring)', 'role:pm', { disc: 'pm', w: 0, est: 16, ps: '2026-10-26', pf: '2026-10-26' }),
      T('M3', 'meeting', 'Structural & MEP coordination review', 'role:pm', { disc: 'pm', w: 0, est: 6, ps: '2026-11-12', pf: '2026-11-12' }),
    ]],
    ['Architectural design', [
      T('1', 'task', 'Architectural design refinement', 'role:arch', { disc: 'arch', w: 16, est: 240, contrib: ['hossam', 'ahmeds'], ps: '2026-10-26', pf: '2026-12-04', deps: ['2.0A'], legacy: '2.1',
        sub: [G('Floor plans', ['Refine room layouts and circulation', 'Develop architectural dimensions', 'Coordinate levels and ceiling heights', 'Refine doors, windows and major openings', 'Develop stairs and vertical circulation', 'Coordinate structural and equipment-space requirements']),
          G('Exterior architecture', ['Finalise exterior design and building composition', 'Develop façade materials and cladding transitions', 'Coordinate external windows and doors', 'Establish preliminary exterior wall assemblies', 'Develop exterior detailing at DD level']),
          G('Roof design', ['Finalise roof geometry, ridges, slopes, dormers and overhangs', 'Coordinate preliminary roof framing requirements', 'Review drainage, insulation and attic requirements', 'Coordinate roof openings and penetrations']),
          G('Building sections & assemblies', ['Develop building sections and key levels', 'Coordinate floor-to-floor and ceiling heights', 'Develop preliminary wall, floor and roof assemblies', 'Review module interfaces and architectural constraints']),
          G('Internal review', ['Review the complete developed architecture', 'Resolve outstanding design issues', 'Update the Revit model', 'Prepare for preliminary multidisciplinary review'])] }),
    ]],
    ['Interior design', [
      T('2', 'task', 'Interior design development', 'role:int', { disc: 'int', w: 18, est: 260, contrib: ['mai', 'hannah'], ps: '2026-10-26', pf: '2026-12-04', deps: ['2.0A'], legacy: '2.2',
        sub: [G('Interior schematic design', ['Develop the interior design concept', 'Establish preliminary space planning', 'Develop the preliminary material palette', 'Create preliminary furniture arrangements', 'Review the schematic design internally']),
          G('Detailed interior space planning', ['Finalise circulation and furniture clearances', 'Develop interior partitions', 'Coordinate doors and openings', 'Establish ceiling design and major interior elements']),
          G('Cabinetry & built-in furniture', ['Design kitchen cabinetry and islands', 'Design bathroom cabinetry', 'Develop wardrobes and closets', 'Design custom built-in furniture', 'Coordinate appliance dimensions', 'Coordinate plumbing and electrical connections', 'Develop cabinetry elevations and preliminary details'].map((t) => ({ t, owner: 'role:int', contrib: ['jocelyn'] }))),
          G('Interior finishes', ['Assign wall finishes', 'Assign floor finishes', 'Assign ceiling finishes', 'Select fixtures, fittings and hardware', 'Coordinate material transitions', 'Develop the preliminary room finish schedule']),
          G('Lighting & MEP coordination', ['Develop the interior lighting concept', 'Coordinate fixtures and lighting controls', 'Coordinate visible HVAC equipment and grilles', 'Confirm plumbing fixtures and service requirements', 'Resolve technical conflicts affecting the interior']),
          G('Interior finalisation', ['Complete interior elevations', 'Update the interior model', 'Finalise material and finish selections', 'Prepare the client presentation', 'Obtain client confirmation'])] }),
    ]],
    ['Preliminary engineering & manufacturing analysis', [
      T('3', 'task', 'Preliminary structural analysis', 'role:str', { disc: 'str', w: 9, est: 80, contrib: ['ali'], ps: '2026-11-02', pf: '2026-12-02', deps: ['2.0B'], legacy: '2.4',
        outputs: ['Preliminary structural framing model / diagrams', 'Preliminary structural calculations', 'Preliminary foundation concept', 'Structural coordination report'],
        sub: ['Establish structural design criteria and preliminary loads', 'Develop the preliminary framing system', 'Identify major members and load paths', 'Develop preliminary foundation assumptions',
          'Identify significant openings and structural restrictions', 'Review modular structural interfaces', 'Develop preliminary calculations or assessments', 'Identify required architectural changes'] }),
      T('4', 'task', 'Preliminary MEP analysis', 'role:mep', { disc: 'mep', w: 9, est: 90, contrib: ['kiran'], ps: '2026-11-02', pf: '2026-12-02', deps: ['2.0B'], legacy: '2.3',
        outputs: ['Preliminary mechanical diagrams', 'Preliminary plumbing diagrams', 'Preliminary electrical diagrams', 'Preliminary equipment schedule', 'Preliminary MEP calculations', 'Missing-information and coordination report'],
        sub: ['Establish heating and cooling system types', 'Preliminary heating and cooling load calculations', 'Preliminary equipment selections and capacities', 'Identify equipment-space requirements',
          'Develop ventilation and duct-routing concepts', 'Preliminary domestic-water and sanitary diagrams', 'Select the domestic hot-water strategy', 'Preliminary electrical distribution and service',
          'Identify risers, shafts and utility entry points', 'Coordinate interfaces with Architecture and Structural'] }),
      T('5', 'task', 'Preliminary manufacturing analysis', 'role:mfg', { disc: 'mfg', w: 9, est: 60, ps: '2026-11-04', pf: '2026-12-04', deps: ['2.0B'], legacy: '2.5',
        outputs: ['Preliminary modular box layout', 'Manufacturing feasibility assessment', 'Preliminary shipping and transportation report', 'Manufacturing coordination report'],
        sub: ['Validate design against modular manufacturing constraints', 'Establish preliminary module/box layouts', 'Identify mating lines and modular connections', 'Assess manufacturing feasibility',
          'Review shipping dimensions, weights and transport restrictions', 'Identify lifting and installation considerations', 'Coordinate major Structural and MEP interfaces', 'Identify required design modifications'] }),
    ]],
    ['Vendors, site surveys & utilities', [
      T('6', 'task', 'Vendors, shop drawings & specifications', 'role:pm', { disc: 'pm', w: 7, est: 40, ps: '2026-10-26', pf: '2026-12-04', vendors: true }),
      T('7', 'task', 'Site surveys & utility information', 'role:civ', { disc: 'civ', w: 6, est: 30, ps: '2026-10-19', pf: '2026-11-13', blocker: 'Topographic survey not yet received (see 1.2 missing-information register)' }),
      T('13', 'decision', 'Confirm applicability: soil erosion permit', 'role:civ', { disc: 'civ', w: 0, est: 4, ps: '2026-10-19', pf: '2026-11-06', options: ['Applicable', 'Not applicable'], jur: 'J1' }),
    ]],
    ['Client sign-offs', [
      T('8', 'signoff', 'Window selection sheet, signed by client', 'role:arch', { disc: 'arch', w: 3, est: 2, ps: '2026-12-07', pf: '2026-12-09', doc: 'Signed_Window_Selection.pdf' }),
      T('9', 'signoff', 'Finish selections, signed by client', 'role:int', { disc: 'int', w: 3, est: 2, ps: '2026-12-07', pf: '2026-12-09', deps: ['2.2'], doc: 'Signed_Finish_Selections.pdf' }),
      T('10', 'signoff', 'Updated cost estimate, signed by client', 'role:pm', { disc: 'pm', w: 3, est: 8, ps: '2026-12-07', pf: '2026-12-10', doc: 'Signed_Updated_Cost_Estimate.pdf' }),
    ]],
    ['Lead approvals, external review & Design Freeze', [
      T('11a', 'review', 'Preliminary Structural Lead approval', 'role:str', { disc: 'str', w: 1, est: 2, ps: '2026-12-07', pf: '2026-12-08', deps: ['2.3'] }),
      T('11b', 'review', 'Preliminary MEP Lead approval', 'role:mep', { disc: 'mep', w: 1, est: 2, ps: '2026-12-07', pf: '2026-12-08', deps: ['2.4'] }),
      T('11c', 'review', 'Preliminary Manufacturing Lead approval', 'role:mfg', { disc: 'mfg', w: 1, est: 2, ps: '2026-12-07', pf: '2026-12-08', deps: ['2.5'] }),
      T('11d', 'review', "External Reviewer's review of the coordinated DD package", 'extrev', { disc: 'ext', w: 0, est: 6, ps: '2026-12-09', pf: '2026-12-14', deps: ['2.11a', '2.11b', '2.11c'] }),
      T('12', 'signoff', 'Client-signed Design Freeze package', 'role:pm', { disc: 'pm', w: 3, est: 6, ps: '2026-12-15', pf: '2026-12-18', deps: ['2.11d'], doc: 'Client_Signed_Design_Freeze.pdf' }),
    ]],
  ] },

  { title: 'Coordinated Design', gate: 'Coordinated model approval', wps: [
    ['Technical handover', [
      T('1', 'task', 'Technical handover', 'role:pm', { disc: 'pm', w: 8, est: 24, ps: '2027-01-04', pf: '2027-01-08',
        sub: ['Issue the approved DD baseline and Revit model', 'Hold the Technical Handover Meeting', 'Review architectural, interior, engineering and manufacturing requirements',
          'Assign detailed modeling responsibilities', 'Confirm model-sharing standards and coordination deadlines', 'Establish required technical model deliverables'] }),
    ]],
    ['Discipline technical modeling', [
      T('2', 'task', 'Detailed structural modeling', 'role:str', { disc: 'str', w: 18, est: 200, ps: '2027-01-11', pf: '2027-02-12', deps: ['3.1'], contrib: ['jared', 'ali'],
        sub: ['Develop detailed Structural BIM and analytical models', 'Develop the structural framing system', 'Coordinate foundations, floor and roof framing', 'Develop primary structural connections',
          { t: 'Coordinate module connections and MWF framing', owner: 'jared' }, 'Update technical calculations', 'Publish the Structural Model'] }),
      T('3', 'task', 'Detailed MEP modeling', 'role:mep', { disc: 'mep', w: 18, est: 220, contrib: ['kiran'], ps: '2027-01-11', pf: '2027-02-12', deps: ['3.1'],
        sub: ['Develop detailed Mechanical, Electrical and Plumbing models', 'Coordinate major equipment locations', 'Model principal distribution systems', 'Coordinate ductwork, plumbing and electrical routing',
          'Develop risers, penetrations and service connections', 'Complete relevant calculations', 'Publish the MEP Models'] }),
      T('4', 'task', 'Architecture & interior technical coordination', 'role:arch', { disc: 'arch', w: 16, est: 160, ps: '2027-01-11', pf: '2027-02-12', deps: ['3.1'], contrib: ['role:int', 'ahmedm'],
        sub: ['Update the approved Architecture and Interior models', 'Coordinate architectural openings and assemblies', 'Coordinate interior partitions and ceilings', 'Coordinate cabinetry and fixed furniture',
          'Resolve engineering interfaces', 'Preserve the approved DD design baseline'] }),
      T('5', 'task', 'Manufacturing technical coordination', 'role:mfg', { disc: 'mfg', w: 12, est: 120, ps: '2027-01-11', pf: '2027-02-12', deps: ['3.1'],
        sub: ['Develop the detailed module configuration', 'Coordinate major module interfaces', 'Confirm relevant connections', 'Coordinate Structural and MEP systems within modules', 'Validate shipping, lifting and installation restrictions', 'Publish the Manufacturing Model'] }),
    ]],
    ['BIM federation & clash detection', [
      T('6', 'task', 'BIM federation & clash detection', 'role:bim', { disc: 'bim', w: 18, est: 140, contrib: ['mohit', 'parvez'], ps: '2027-01-18', pf: '2027-02-19', deps: ['3.1'], legacy: '3.7 (old Phase 03)',
        sub: ['Collect the latest discipline models', 'Federate models in ACC', 'Run clash detection', 'Categorise issues by discipline and severity', 'Assign issues to responsible team members',
          'Conduct regular BIM coordination meetings', 'Track issue resolution', 'Re-run clash detection after updates', 'Verify and close submission-critical clashes'] }),
      T('M1', 'meeting', 'BIM coordination meeting (weekly)', 'role:bim', { disc: 'bim', w: 0, est: 20, ps: '2027-01-20', pf: '2027-01-20' }),
    ]],
    ['Coordinated model release', [
      T('7', 'review', 'Coordinated model release', 'role:pm', { disc: 'pm', w: 10, est: 24, ps: '2027-02-22', pf: '2027-02-26', deps: ['3.2', '3.3', '3.4', '3.5', '3.6'],
        outputs: ['Approved Architectural Model', 'Approved Interior Model', 'Approved Structural Model', 'Approved MEP Models', 'Approved Manufacturing Model', 'Federated BIM Model', 'Clash detection and closure report', 'Coordinated model handover record'] }),
    ]],
  ] },

  { title: 'Permit Documentation', gate: 'Permit submission', wps: [
    ['Permit set-up & jurisdiction', [
      T('1', 'meeting', 'Confirm the applicable permit sheet index', 'role:pm', { disc: 'pm', w: 3, est: 8, ps: '2027-03-01', pf: '2027-03-01', legacy: '3.1' }),
      T('13', 'review', 'Jurisdiction verification checkpoint', 'role:pm', { disc: 'pm', w: 0, est: 8, ps: '2027-04-05', pf: '2027-04-09', legacy: '3.13', note: 'Passes only when no relevant requirement is Potential or Stale (rules J1–J5).' }),
    ]],
    ['Permit sheet production', [
      T('2', 'task', 'Extract drawings from the coordinated Revit models', 'role:bim', { disc: 'bim', w: 8, est: 40, contrib: ['vandana'], ps: '2027-03-01', pf: '2027-03-05' }),
      T('3', 'task', 'Architecture permit sheets', 'role:arch', { disc: 'arch', w: 24, est: 180, contrib: ['hossam', 'ahmeds'], ps: '2027-03-08', pf: '2027-04-02', deps: ['4.2'], legacy: '3.2', sheets: ['A-001', 'A-101', 'A-102', 'A-201', 'A-301', 'A-302', 'A-501', 'A-601'] }),
      T('4', 'task', 'Structural permit sheets & calculations', 'role:str', { disc: 'str', w: 14, est: 120, contrib: ['ali'], ps: '2027-03-08', pf: '2027-04-02', deps: ['4.2'], legacy: '3.3', sheets: ['S-001', 'S-101', 'S-501'] }),
      T('5', 'task', 'MEP permit sheets & calculations', 'role:mep', { disc: 'mep', w: 16, est: 130, contrib: ['kiran'], ps: '2027-03-08', pf: '2027-04-02', deps: ['4.2'], legacy: '3.4', sheets: ['M-101', 'E-101', 'P-101'] }),
      T('6', 'task', 'Civil / site documentation', 'role:civ', { disc: 'civ', w: 9, est: 60, contrib: ['anees'], ps: '2027-03-08', pf: '2027-03-26', legacy: '3.5', sheets: ['C-101'] }),
      T('7', 'task', 'Manufacturing / state modular requirements', 'role:mfg', { disc: 'mfg', w: 6, est: 40, ps: '2027-03-08', pf: '2027-04-02', legacy: '3.6', req: 'conditional' }),
      T('7d', 'decision', 'Decision: Michigan modular approval route', 'role:mfg', { disc: 'mfg', w: 0, est: 4, ps: '2027-03-01', pf: '2027-03-12', options: ['Existing approval', 'Modification (BCC-323)', 'New approval (BCC-323)'], jur: 'J3' }),
    ]],
    ['QA/QC, external review & seals', [
      T('8', 'review', 'Internal discipline QA/QC', 'role:pm', { disc: 'pm', w: 5, est: 24, ps: '2027-04-05', pf: '2027-04-08', deps: ['4.3', '4.4', '4.5', '4.6'], legacy: '3.8' }),
      T('9', 'task', 'Consolidate the complete package', 'role:pm', { disc: 'pm', w: 4, est: 12, ps: '2027-04-09', pf: '2027-04-12', deps: ['4.8'], legacy: '3.9' }),
      T('10', 'review', "External Reviewer's final package review", 'extrev', { disc: 'ext', w: 3, est: 8, ps: '2027-04-13', pf: '2027-04-15', deps: ['4.9'], legacy: '3.10' }),
      T('11', 'task', "Resolve External Reviewer's redlines", 'role:arch', { disc: 'arch', w: 4, est: 24, ps: '2027-04-16', pf: '2027-04-19', deps: ['4.10'] }),
      T('12', 'task', 'Signatures & professional seals recorded', 'role:pm', { disc: 'pm', w: 2, est: 6, ps: '2027-04-20', pf: '2027-04-20', deps: ['4.11'], legacy: '3.11' }),
    ]],
    ['Authorisation & submission', [
      T('14', 'review', 'Authorise the exact sheet revisions for submission', 'role:pm', { disc: 'pm', w: 1, est: 2, ps: '2027-04-21', pf: '2027-04-21', deps: ['4.12', '4.13'], legacy: '3.14' }),
      T('15', 'submission', 'Permit submitted', 'role:pm', { disc: 'pm', w: 1, est: 2, ps: '2027-04-22', pf: '2027-04-22', deps: ['4.14'], legacy: '3.12' }),
      T('16', 'milestone', 'Documented receipt recorded', 'role:pm', { disc: 'pm', w: 0, est: 1, ps: '2027-04-23', pf: '2027-04-23', deps: ['4.15'], legacy: '3.15' }),
    ]],
  ] },

  { title: 'Construction Documents & Manufacturing Readiness', gate: 'Construction release', wps: [
    ['Architectural construction sheets', [
      T('1', 'task', 'Fully dimensioned construction plans', 'role:arch', { disc: 'arch', w: 8, est: 90, ps: '2027-04-26', pf: '2027-05-21' }),
      T('2', 'task', 'Enlarged plans', 'role:arch', { disc: 'arch', w: 5, est: 50, ps: '2027-05-03', pf: '2027-05-28' }),
      T('3', 'task', 'Detailed building and wall sections', 'role:arch', { disc: 'arch', w: 7, est: 70, ps: '2027-05-03', pf: '2027-06-04' }),
      T('4', 'task', 'Roof and exterior assembly details', 'role:arch', { disc: 'arch', w: 6, est: 60, ps: '2027-05-10', pf: '2027-06-11' }),
      T('5', 'task', 'Window and door installation details', 'role:arch', { disc: 'arch', w: 5, est: 40, ps: '2027-05-17', pf: '2027-06-11' }),
      T('6', 'task', 'Construction specifications', 'role:arch', { disc: 'arch', w: 4, est: 40, ps: '2027-05-24', pf: '2027-06-18' }),
    ]],
    ['Interior construction sheets', [
      T('7', 'task', 'Interior millwork and cabinetry details', 'role:int', { disc: 'int', w: 8, est: 90, ps: '2027-04-26', pf: '2027-06-04', contrib: ['jocelyn'] }),
      T('8', 'task', 'Equipment and fixture schedules', 'role:int', { disc: 'int', w: 4, est: 30, ps: '2027-05-17', pf: '2027-06-11' }),
    ]],
    ['Structural construction sheets & details', [
      T('9', 'task', 'Foundation and structural interfaces', 'role:str', { disc: 'str', w: 7, est: 80, ps: '2027-04-26', pf: '2027-05-28' }),
      T('10', 'task', 'Structural technical details', 'role:str', { disc: 'str', w: 5, est: 60, ps: '2027-05-10', pf: '2027-06-11' }),
    ]],
    ['Mechanical construction sheets', [T('11', 'task', 'Mechanical construction sheets', 'role:mep', { disc: 'mep', w: 5, est: 60, ps: '2027-04-26', pf: '2027-06-04' })]],
    ['Electrical construction sheets', [T('12', 'task', 'Electrical construction sheets', 'role:mep', { disc: 'mep', w: 5, est: 50, ps: '2027-04-26', pf: '2027-06-04' })]],
    ['Plumbing construction sheets', [T('13', 'task', 'Plumbing construction sheets', 'role:mep', { disc: 'mep', w: 5, est: 50, ps: '2027-04-26', pf: '2027-06-04' })]],
    ['Civil & site construction sheets', [T('14', 'task', 'Civil & site construction sheets', 'role:civ', { disc: 'civ', w: 5, est: 50, ps: '2027-04-26', pf: '2027-05-28' })]],
    ['Manufacturing & modular assembly drawings', [
      T('15', 'task', 'Manufacturing and on-site installation interfaces', 'role:mfg', { disc: 'mfg', w: 5, est: 50, ps: '2027-05-03', pf: '2027-06-11' }),
      T('16', 'task', 'Modular assembly drawings', 'role:mfg', { disc: 'mfg', w: 5, est: 60, ps: '2027-05-10', pf: '2027-06-18' }),
    ]],
    ['Vendor shop drawing coordination', [T('17', 'task', 'Vendor shop drawing coordination', 'role:pm', { disc: 'pm', w: 5, est: 40, ps: '2027-04-26', pf: '2027-06-18' })]],
    ['Final construction documentation review', [
      T('18', 'task', 'Permit comment integration', 'role:pm', { disc: 'pm', w: 3, est: 24, ps: '2027-05-03', pf: '2027-06-18' }),
      T('19', 'review', 'Final CD review & construction release', 'role:pm', { disc: 'pm', w: 3, est: 16, ps: '2027-06-21', pf: '2027-06-25', deps: ['5.18'] }),
    ]],
  ] },

  { title: 'Site Work, Manufacturing & Construction', gate: null, unscoped: true, wps: [
    ['Site preparation & civil works', []], ['Foundations & site infrastructure', []], ['Factory production & manufacturing', []],
    ['Transportation & module installation', []], ['On-site construction & MEP connections', []], ['Inspections & quality control', []], ['Project completion & client handover', []],
  ] },
];

// Gate conditions by phase index. ev: codes (items evidence) | {upload, requires} | {computed} | 'release'
export const GATE_CONDS = [
  [['Required conceptual deliverables complete', 'role:pm', ['1.7', '1.8', '1.9', '1.10', '1.11', '1.14']],
    ['Final exterior concept approved', 'role:client', { upload: 'Signed_Exterior_Concept_Approval.pdf', requires: ['1.15'] }],
    ['Final interior concept approved', 'role:client', { upload: 'Signed_Interior_Concept_Approval.pdf', requires: ['1.15'] }],
    ['Material selection list signed', 'role:client', ['1.12']], ['Appliance selection list signed', 'role:client', ['1.13']],
    ['Initial cost estimate acknowledged', 'role:client', { upload: 'Cost_Estimate_Acknowledgement.pdf', requires: ['1.11', '1.15'] }],
    ['Contract for Phase 02 signed', 'role:client', ['1.17']], ['Project Manager releases Phase 02', 'role:pm', 'release']],
  [['Final architectural design approved', 'role:arch', ['2.1']], ['Final interior design approved', 'role:int', ['2.2']],
    ['Window selections signed', 'role:client', ['2.8']], ['Finish selections signed', 'role:client', ['2.9']], ['Updated cost estimate signed', 'role:client', ['2.10']],
    ['Preliminary Structural Lead approval', 'role:str', ['2.11a']], ['Preliminary MEP Lead approval', 'role:mep', ['2.11b']], ['Preliminary Manufacturing Lead approval', 'role:mfg', ['2.11c']],
    ["External Reviewer's review of the finished coordinated DD package", 'role:pm', ['2.11d']],
    ['Mandatory review comments resolved', 'role:pm', { upload: 'Review_Comment_Closure_Log.pdf', requires: ['2.11d'] }],
    ['Client-signed Design Freeze package', 'role:client', ['2.12']], ['Project Manager releases Phase 03', 'role:pm', 'release']],
  [['Architecture & Interior models internally approved', 'role:arch', ['3.4']], ['Structural model internally approved', 'role:str', ['3.2']],
    ['MEP models internally approved', 'role:mep', ['3.3']], ['Manufacturing model internally approved', 'role:mfg', ['3.5']],
    ['All critical coordination issues resolved', 'role:bim', ['3.6']], ['Coordinated model release record issued', 'role:pm', ['3.7']],
    ['Project Manager releases the coordinated package for permitting', 'role:pm', 'release']],
  [['All required permit sheets complete', 'role:pm', ['4.3', '4.4', '4.5', '4.6']], ['Internal discipline QA/QC complete', 'role:pm', ['4.8']],
    ["External Reviewer's review complete and redlines resolved", 'role:pm', ['4.10', '4.11']], ['Seals / signatures recorded by licensed professionals', 'role:pm', ['4.12']],
    ['Conditional permit requirements resolved', 'role:pm', { computed: 'conditionals' }], ['Jurisdiction verification checkpoint passed', 'role:pm', { computed: 'jurisdiction', items: ['4.13'] }],
    ['Exact sheet revisions authorised', 'role:pm', ['4.14']], ['Permit submitted', 'role:pm', ['4.15']], ['Documented receipt from the authority', 'role:pm', ['4.16']],
    ['Project Manager releases Phase 05', 'role:pm', 'release']],
  [['Architectural CD package complete', 'role:arch', ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6']], ['Interior CD package complete', 'role:int', ['5.7', '5.8']],
    ['Engineering CD packages complete', 'role:pm', ['5.9', '5.10', '5.11', '5.12', '5.13', '5.14']], ['Critical vendor data incorporated', 'role:pm', ['5.17']],
    ['Manufacturing / assembly documentation ready', 'role:mfg', ['5.15', '5.16']], ['Permit comments dispositioned', 'role:pm', ['5.18']],
    ['Local building permit issued', 'role:pm', { upload: 'Issued_Building_Permit.pdf', requires: [], legal: true }],
    ['State modular approval (if the route requires it)', 'role:mfg', { upload: 'State_BSAR_Approval.pdf', requires: ['4.7d'], legal: true }],
    ['Project Manager construction release', 'role:pm', 'release']],
];

export const ACTIONS = [
  { id: 'A-01', task: '1.6', text: "Confirm setback constraints against the client's survey before the package is issued", owner: 'role:arch', due: '2026-10-02', critical: true, gate: 0, status: 'open' },
];

export const INFO_REQUESTS = [
  { id: 'IR-01', text: 'Seasonal high-groundwater data for the lakefront parcel', to: 'role:geo', status: 'open', due: '2026-10-09' },
  { id: 'IR-02', text: 'Sanitary sewer connection point and invert elevation', to: 'anees', status: 'open', due: '2026-10-02' },
  { id: 'IR-03', text: 'Topographic survey with existing spot elevations', to: 'role:surv', status: 'open', due: '2026-10-02' },
  { id: 'IR-04', text: 'Utility company confirmation of electrical service capacity', to: 'reilly', status: 'open', due: '2026-10-09' },
  { id: 'IR-05', text: 'Crane setup location and delivery route constraints', to: 'role:mfg', status: 'open', due: '2026-10-16' },
  { id: 'IR-06', text: 'Recorded easements from the title commitment', to: 'role:pm', status: 'received', due: '2026-09-22' },
];

export const VENDORS = [
  ['Windows & doors', 'Window and door manufacturer', 'Preliminary product selection, performance data, opening requirements', ['2.6', '2.8', '2.1'], ['arch'], ['A-601', 'A-501']],
  ['Windows & doors', 'Window shop drawings & installation requirements', 'Shop drawings, installation and rough-opening details', ['2.6', '5.5'], ['arch', 'mfg'], ['A-501']],
  ['Building envelope', 'Cladding supplier', 'Material specs, attachment system, transitions', ['2.6', '2.1'], ['arch'], ['A-001', 'A-201']],
  ['Building envelope', 'Roofing & waterproofing system', 'System data, underlayment, flashing details', ['2.6', '2.1'], ['arch'], ['A-104', 'A-501']],
  ['Building envelope', 'Insulation system', 'R-values, assembly compatibility', ['2.6', '2.0B'], ['arch', 'mep'], ['A-001', 'G-003']],
  ['Mechanical & plumbing', 'Heat pump / boiler equipment', 'Capacities, clearances, electrical requirements', ['2.6', '2.4'], ['mep'], ['M-101']],
  ['Mechanical & plumbing', 'Water-heating equipment', 'Type, capacity, venting, clearances', ['2.6', '2.4'], ['mep'], ['P-101']],
  ['Mechanical & plumbing', 'Ventilation / ERV system', 'Airflow, duct sizes, controls', ['2.6', '2.4'], ['mep'], ['M-101']],
  ['Mechanical & plumbing', 'Plumbing fixtures', 'Fixture specs, rough-in dimensions', ['2.6', '2.2'], ['mep', 'int'], ['P-101', 'A-401']],
  ['Interior & manufacturing', 'Cabinetry and millwork vendor', 'Cabinet, island, wardrobe shop drawings', ['2.6', '2.2'], ['int'], ['A-401', 'A-402', 'A-502']],
  ['Interior & manufacturing', 'Appliance supplier', 'Model numbers, dimensions, power, ventilation', ['2.6', '2.2', '2.4'], ['int', 'mep'], ['A-401']],
  ['Interior & manufacturing', 'Interior finish suppliers', 'Samples, specs, availability', ['2.6', '2.2'], ['int'], ['A-602']],
  ['Interior & manufacturing', 'Modular manufacturing components', 'Connection hardware, mating components', ['2.6', '2.5'], ['mfg', 'str'], ['S-501']],
].map(([cat, name, info, tasks, discs, sheets], i) => ({ id: `V-${String(i + 1).padStart(2, '0')}`, cat, name, info, tasks, discs, sheets, status: i < 2 ? 'requested' : 'not_started' }));

export const JURISDICTION = [
  { id: 'J1', title: 'Soil erosion permit (within 500 ft of water)', authority: 'Issuing agency not yet sourced', track: 'Soil erosion', status: 'potential', reviewer: 'role:civ' },
  { id: 'J2', title: 'Code edition confirmation (2015 MRC incl. energy)', authority: 'Local building department (sample)', track: 'Local building', status: 'potential', reviewer: 'role:arch' },
  { id: 'J3', title: 'Michigan premanufactured unit approval route', authority: 'LARA Bureau of Construction Codes', track: 'State modular', status: 'blocked', reviewer: 'role:mfg' },
  { id: 'J4', title: 'Zoning & drainage review', authority: 'Local authority (sample)', track: 'Zoning & drainage', status: 'verified', reviewer: 'role:pm', source: 'example.org (sample source)', verifiedOn: '2026-09-25' },
  { id: 'J5', title: 'Building permit & inspections', authority: 'Local building department (sample)', track: 'Local building', status: 'verified', reviewer: 'role:pm', source: 'example.org (sample source)', verifiedOn: '2026-09-25' },
];

// External reviewer's sample sheet index (29) + one proposed modular sheet. lead = accountable discipline lead.
const S = (no, title, lead, owner = lead, o = {}) => ({ no, title, lead, owner, contrib: [], reviewers: [], pct: 0, approval: 'not_started', revs: [], ps: null, pf: null, as: null, af: null, task: null, ...o });
export const SHEETS = [
  S('G-001', 'Cover Sheet: project data, sheet index, vicinity map, code summary', 'role:pm'), S('G-002', 'General Notes, Symbols & Abbreviations', 'role:arch'), S('G-003', 'Energy Code Compliance', 'role:arch', 'role:arch', { contrib: ['role:mep'] }),
  S('C-101', 'Site Plan: grading, drainage & utilities', 'role:civ', 'anees', { contrib: ['reilly'] }), S('L-101', 'Landscape Plan', 'role:arch', 'role:arch', { conditional: 'Only when landscape is in scope' }),
  S('A-001', 'Wall Types & Typical Assemblies', 'role:arch'),
  S('A-101', 'Basement / Lowest-Level Floor Plan', 'role:arch', 'hossam', { pct: 40, approval: 'in_production', revs: [{ rev: 'C1', purpose: 'Concept draft', date: '2026-09-22' }], ps: '2026-09-17', pf: '2026-09-30', as: '2026-09-17', task: '1.7' }),
  S('A-102', 'First Floor Plan', 'role:arch', 'hossam', { pct: 45, approval: 'in_production', contrib: ['ahmeds'], revs: [{ rev: 'C1', purpose: 'Concept draft', date: '2026-09-22' }], ps: '2026-09-17', pf: '2026-09-30', as: '2026-09-18', task: '1.7' }),
  S('A-103', 'Second Floor Plan', 'role:arch', 'hossam', { pct: 20 }), S('A-104', 'Roof Plan', 'role:arch'),
  S('A-201', 'Exterior Elevations: Front & Rear', 'role:arch', 'ahmedm', { pct: 25, approval: 'in_production', ps: '2026-09-21', pf: '2026-10-02', as: '2026-09-21', task: '1.8' }),
  S('A-202', 'Exterior Elevations: Left & Right', 'role:arch', 'ahmedm', { pct: 25, approval: 'in_production', ps: '2026-09-21', pf: '2026-10-02', as: '2026-09-21', task: '1.8' }),
  S('A-301', 'Building Sections', 'role:arch'), S('A-302', 'Wall Sections', 'role:arch', 'role:arch', { reviewers: ['role:str'] }),
  S('A-401', 'Enlarged Plans: Kitchen & Baths', 'role:int', 'role:int', { contrib: ['jocelyn'] }), S('A-402', 'Interior Elevations', 'role:int', 'role:int', { contrib: ['jocelyn'] }),
  S('A-501', 'Exterior Details: eaves, rakes, flashing, penetrations', 'role:arch'), S('A-502', 'Interior Details: stairs, railings, casework', 'role:int', 'role:int', { contrib: ['jocelyn'] }),
  S('A-503', 'Module Mating Details', 'role:arch', 'role:arch', { proposed: 'Proposed sheet. Numbering needs External Reviewer and Architecture Lead approval', contrib: ['role:mfg'] }),
  S('A-601', 'Door & Window Schedules', 'role:arch'), S('A-602', 'Room Finish Schedule', 'role:int'),
  S('S-001', 'General Structural Notes & Design Criteria', 'role:str', 'ali'), S('S-101', 'Foundation Plan', 'role:str', 'ali'), S('S-102', 'First Floor Framing Plan', 'role:str', 'jared'),
  S('S-103', 'Second Floor / Ceiling Framing Plan', 'role:str', 'jared'), S('S-104', 'Roof Framing Plan', 'role:str', 'jared'), S('S-501', 'Structural Details', 'role:str', 'ali', { contrib: ['jared'] }),
  S('M-101', 'HVAC Plans', 'role:mep', 'kiran'), S('E-101', 'Electrical & Lighting Plans', 'role:mep', 'kiran'), S('P-101', 'Plumbing Plans & Riser Diagram', 'role:mep', 'kiran'),
];
export const SHEET_DISCIPLINES = [['G', 'General'], ['C', 'Civil'], ['L', 'Landscape'], ['A', 'Architectural'], ['S', 'Structural'], ['M', 'Mechanical'], ['E', 'Electrical'], ['P', 'Plumbing']];

// BCC-323 (rev 04/2024) + four internal items. Conditional ones need their reviewer.
const R = (code, text, primary, secondary = [], applicability = 'required', source = 'BCC-323') => ({ code, text, primary, secondary, applicability, source, status: 'not_met' });
export const REQUIREMENTS = [
  R('B01', 'Mating details', 'S-501', ['A-302', 'A-503']), R('B02', 'Foundation connection details', 'S-501', ['S-101']), R('B03', 'Exterior elevations', 'A-201', ['A-202']),
  R('B04', 'Major cross sections', 'A-301', ['A-302']), R('B05', 'Wall section', 'A-302'), R('B06', 'Flashing details', 'A-501'), R('B07', 'Attic access', 'A-104', ['A-302']),
  R('B08', 'Attic ventilation', 'A-104', ['A-302']), R('B09', 'Exterior materials & finishes', 'A-201', ['A-602']), R('B10', 'Interior materials & finishes', 'A-602', ['A-402']),
  R('B11', 'Fire separation assembly locations', 'A-001', ['A-302']), R('B12', 'Door / window schedules', 'A-601'), R('B13', 'Foundation plans', 'S-101'),
  R('B14', 'Crawl space venting', 'A-302', ['M-101']), R('B15', 'Energy conservation calculations', 'G-003'), R('B16', 'Accessibility details', 'G-002', ['A-401'], 'conditional'),
  R('B17', 'Smoke detector locations', 'E-101', ['A-102']), R('B18', 'Fire resistance rating / details', 'A-001', ['A-302']), R('B19', 'Firestopping / draftstopping details', 'A-501', ['A-302']),
  R('B20', 'Stair details', 'A-502'), R('B21', 'Toxicity & flame spread of interior finishes', 'A-602', ['G-002']), R('B22', 'Design soil bearing capacity', 'S-001', ['S-101']),
  R('B23', 'Foundation loads', 'S-101', ['S-001']), R('B24', 'Foundation sizes & details', 'S-101', ['S-501']), R('B25', 'Structural framing details', 'S-501', ['S-102']),
  R('B26', 'Header / lintel schedules', 'S-501', ['S-102']), R('B27', 'Truss design', 'S-104', ['S-501']), R('B28', 'Fastener schedule', 'S-501'),
  R('B29', 'Label & data plate location', 'G-002', ['A-503']), R('B30', 'Site installed items', 'G-002', ['S-501']),
  ...['Panel schedule(s)', 'Service equipment plan or riser diagram', 'Grounding method and details', 'Load calculations', 'Size of feeders and branch circuits', 'Location of main disconnect',
    'Method of interconnection between units', 'Location of outlets and junction boxes', 'Fixture mounting method', 'Special equipment or appliance locations', 'Optional equipment plans or details', 'Site installed items']
    .map((t, i) => R(`E${String(i + 1).padStart(2, '0')}`, t, 'E-101')),
  ...[['Heating system installed in the factory? (Yes/No)'], ['Heating equipment supplied? (Yes/No)'], ['Heating and cooling equipment locations'], ['Equipment load calculations'], ['Duct design calculations'],
    ['Duct and register layouts'], ['Locations of exhaust grills in bathrooms'], ['Exhaust duct material'], ['Combustion air requirements'], ['Ventilating air requirements'], ['Venting systems', 1],
    ['Fire damper locations', 1], ['Air balancing device locations', 1], ['Smoke detectors in ductwork', 1], ['Sprinkler system', 1], ['Sprinkler plans', 1], ['Sprinkler calculations', 1],
    ['Manufactured fireplace specification'], ['Site installed items']].map(([t, c], i) => R(`M${String(i + 1).padStart(2, '0')}`, t, 'M-101', [], c ? 'conditional' : 'required')),
  ...['Water piping system', 'Air chambers', 'Vacuum breaker on hose bibbs', 'Shower valves, type and temperature setting', 'Indirect waste', 'Cleanouts', 'Riser diagram', 'Material specifications',
    'Water heater details', 'Pipe hanger spacing', 'Access panel location', 'Site installed items'].map((t, i) => R(`P${String(i + 1).padStart(2, '0')}`, t, 'P-101')),
  R('I01', 'Transfer grills (bedrooms, laundry, MEP room)', 'M-101', [], 'required', 'Internal'), R('I02', 'ERV / make-up air', 'M-101', [], 'required', 'Internal'),
  R('I03', 'WSFU calculations', 'P-101', [], 'required', 'Internal'), R('I04', 'DFU calculations', 'P-101', [], 'required', 'Internal'),
];
export const CONDITIONAL_REVIEWER = (code) => (code.startsWith('B') ? 'role:arch' : 'role:mep');

// Illustrative timesheets. [person, taskCode, date, hours, status, description]
export const TIME = [
  ['anees', '1.2', '2026-09-14', 4, 'approved', 'Zoning research'], ['anees', '1.2', '2026-09-15', 6, 'approved', 'Utility availability'], ['anees', '1.2', '2026-09-16', 5, 'approved', 'Easements review'],
  ['anees', '1.2', '2026-09-21', 4, 'submitted', 'Stormwater requirements'], ['anees', '1.2', '2026-09-22', 3, 'submitted', 'Sewer connection research'],
  ['reilly', '1.2', '2026-09-15', 3, 'approved', 'Existing site features'], ['reilly', '1.2', '2026-09-17', 4, 'approved', 'Drainage patterns'], ['reilly', '1.2', '2026-09-23', 2, 'draft', 'Utility locations'],
  ['hossam', '1.7', '2026-09-17', 6, 'approved', 'Lowest-level plan'], ['hossam', '1.7', '2026-09-18', 7, 'approved', 'Lowest-level plan'], ['hossam', '1.7', '2026-09-21', 6, 'submitted', 'First floor plan'],
  ['hossam', '1.7', '2026-09-22', 7, 'submitted', 'First floor plan'], ['hossam', '1.7', '2026-09-23', 6, 'submitted', 'Plan revisions'], ['hossam', '1.7', '2026-09-24', 5, 'submitted', 'Plan revisions'],
  ['ahmeds', '1.7', '2026-09-18', 4, 'approved', 'Module grid study'], ['ahmeds', '1.7', '2026-09-22', 5, 'submitted', 'Module break lines'],
  ['ahmedm', '1.8', '2026-09-21', 6, 'approved', 'Front elevation'], ['ahmedm', '1.8', '2026-09-22', 6, 'approved', 'Rear elevation'], ['ahmedm', '1.8', '2026-09-23', 5, 'submitted', 'Side elevations'], ['ahmedm', '1.8', '2026-09-24', 6, 'submitted', 'Side elevations'],
  ['manuel', '1.9', '2026-09-18', 5, 'approved', 'Render setup'],
  ['mai', '1.10', '2026-09-22', 6, 'approved', 'Living room renders'], ['mai', '1.10', '2026-09-23', 6, 'approved', 'Kitchen renders'], ['mai', '1.10', '2026-09-24', 5, 'submitted', 'Bedroom renders'],
  ['hannah', '1.10', '2026-09-23', 4, 'submitted', 'Material boards'],
];

export const PROJECT = { name: 'Demo Residence A', address: 'Sample site, Michigan (demonstration)', method: 'Modular', template: 'Standard Residential Modular v1.0' };

// ── Portfolio (Prototype v3) ────────────────────────────────────────────────
// The first project uses the Demo Residence A data above. The others are generated from the same
// six-phase template, shifted in time (offset, days) and staffed through explicit maps.
// Every assignment, date and hour is ILLUSTRATIVE / NOT VERIFIED.
export const DEMO_PROJECTS = [
  { id: 'P2', name: 'Lakeside Residence', address: 'Sample site, Michigan (demonstration)', offset: -42, active: 2,
    roleMap: { arch: 'mansour', int: 'mai', str: 'ali', mep: 'kiran', civ: 'reilly' },
    personMap: { hossam: 'mansour', ahmeds: 'ahmeds', ahmedm: 'mansour', manuel: 'manuel', mai: 'mai', hannah: 'lara', jocelyn: 'jocelyn', anees: 'reilly', reilly: 'reilly', ali: 'ali', jared: 'jared', kiran: 'kiran', mohit: 'mohit', parvez: 'satendra', vandana: 'satendra' },
    keepRole: ['3.2'],
    extraContrib: { '2.1': ['satendra'], '2.2': ['satendra'], '2.3': ['mohit'] },
    alloc: { '2.1': { mansour: { pct: 40 }, ahmeds: { pct: 40 }, satendra: { pct: 20 } } } },
  { id: 'P3', name: 'Hillside Residence', address: 'Sample site, Michigan (demonstration)', offset: -168, active: 4,
    roleMap: { arch: 'hossam', int: 'hannah', str: 'ali', mep: 'kiran', civ: 'anees' },
    personMap: { hossam: 'hossam', ahmeds: 'mansour', ahmedm: 'ahmedm', manuel: 'hossam', mai: 'mai', hannah: 'hannah', jocelyn: 'jocelyn', anees: 'anees', reilly: 'anees', ali: 'ali', jared: 'jared', kiran: 'kiran', mohit: 'mohit', parvez: 'parvez', vandana: 'muhammedj' },
    extraContrib: { '4.3': ['mohit', 'parvez'], '4.4': ['parvez', 'muhammedj'], '4.2': ['parvez'] },
    alloc: { '4.3': { hossam: { pct: 40 }, mansour: { pct: 20 }, ahmedm: { pct: 20 }, mohit: { pct: 10 }, parvez: { pct: 10 } } } },
  { id: 'P4', name: 'Urban Residence', address: 'Sample site, Michigan (demonstration)', offset: 14, active: 1,
    roleMap: { arch: 'hossam', int: 'mai', str: 'jared', mep: 'kiran', civ: 'anees' },
    personMap: { hossam: 'hossam', ahmeds: 'manuel', ahmedm: 'ahmedm', manuel: 'manuel', mai: 'mai', hannah: 'hannah', jocelyn: 'jocelyn', anees: 'anees', reilly: 'reilly', ali: 'jared', jared: 'jared', kiran: 'kiran', mohit: 'parvez', parvez: 'vandana', vandana: 'vandana' },
    extraContrib: { '1.7': ['vandana'], '1.2': ['reilly'] } },
];
export const DEMO_JURISDICTION = [
  { id: 'J1', title: 'Local zoning review', authority: 'Local authority (sample)', track: 'Zoning & drainage', status: 'potential', reviewer: 'role:pm' },
  { id: 'J2', title: 'Building permit & inspections', authority: 'Local building department (sample)', track: 'Local building', status: 'potential', reviewer: 'role:pm' },
  { id: 'J3', title: 'Michigan premanufactured unit approval route', authority: 'State construction-code agency', track: 'State modular', status: 'blocked', reviewer: 'role:mfg' },
];
// Generic availability exceptions only (Vacation / Unavailable / Training / Public Holiday). Illustrative.
export const CAP_EXCEPTIONS = [
  { id: 'X1', person: 'ahmeds', from: '2026-10-19', to: '2026-10-23', kind: 'Vacation' },
];
export const RP_DEFAULTS = { near: 90, over: 100, available: 70, horizon: 8 };
