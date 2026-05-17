export const NL = {
  appName: 'TaakMaatje',
  appTagline: 'Stap voor stap jouw dag!',
  splashIAmCaregiver: 'Ik ben een begeleider',
  splashFooter: 'TaakMaatje — samen sterk',

  // Client login (PIN only — no client list shown)
  enterPin: 'Vul jouw pincode in',
  pinWrong: 'Verkeerde pincode. Probeer het opnieuw!',
  pinHello: 'Hallo! Vul je pincode in.',
  goIn: 'Naar binnen!',

  // Home
  whatToDo: 'Wat wil je doen?',
  tapATask: 'Tik op een taak om te beginnen.',
  tapToSpeak: 'Tik om te spreken',
  listening: 'Luisteren… zeg een taaknaam',
  switchUser: 'Uitloggen',
  overwhelmedBtn: 'Ik heb een vol hoofd',
  helpBtn: 'Ik heb nu begeleiding nodig',

  // Task screen
  progressLabel: (done, total) => `${done} van ${total} stappen klaar`,
  doThisNow: '👆 Begin hier!',
  voiceHint: 'Gebruik je stem',
  voiceListening: 'Luisteren… zeg "klaar", "herhaal" of "pauze"',
  breakNeeded: 'Even pauzeren?',
  startBreak: 'Neem 5 minuten pauze',
  stopBreak: 'Stop pauze',
  resetWarning: 'Taak reset na 20 minuten inactiviteit.',
  taskResetMsg: 'De taak is opnieuw begonnen omdat je een tijdje weg was.',

  // Celebrate
  celebrateTitle: 'Geweldig gedaan!',
  celebrateSub: (task) => `Je hebt "${task}" afgerond! Super trots op jou! 🌟`,
  backToTasks: 'Terug naar taken',

  // Overwhelmed screen
  overwhelmedTitle: 'Vol hoofd?',
  overwhelmedSub: 'Dat is oké. Kies iets wat helpt.',
  overwhelmedBack: 'Ik voel me beter, terug',

  // Help notification
  helpSent: 'Je begeleider is op de hoogte gebracht! 📱',
  helpTitle: 'Begeleiding nodig',
  helpMsg: 'Jouw begeleider krijgt nu een bericht.',
  helpConfirm: 'Stuur bericht',
  helpCancel: 'Toch niet',

  // Mood
  howDoYouFeel: 'Hoe voel jij je?',
  moodSub: 'Tik hoe je je voelt.',
  backToTasksBtn: 'Terug naar taken',
  moodResponses: {
    Geweldig: { emoji: '😄', text: 'Dat is fantastisch! Je doet het super!' },
    Goed:     { emoji: '🙂', text: 'Goed is prima! Ga zo door.' },
    Moe:      { emoji: '😴', text: 'Het is oké om moe te zijn. Misschien even rusten.' },
    Zenuwachtig: { emoji: '😟', text: 'Rustig ademen helpt. Adem in… en uit. Je bent veilig.' },
    Verdrietig: { emoji: '😢', text: 'Het is oké om verdrietig te zijn. Adem rustig.' },
  },

  // Tree / streak
  streakTitle: 'Jouw boom',
  streakSteps: (n) => `${n} stap${n === 1 ? '' : 'pen'} vandaag`,
  streakEncourage: ['Goed bezig!', 'Super!', 'Geweldig!', 'Jij kan het!', 'Doorgaan!'],

  // Medication reminder
  medReminderTitle: 'Tijd voor medicijnen! 💊',
  medReminderSub: 'Vergeet je medicijnen niet!',
  medReminderDone: 'Ik heb ze genomen ✓',
  medReminderSnooze: 'Herinner me over 10 min',

  // Voice commands
  voiceCmdDone: ['klaar', 'volgende', 'gedaan', 'afgevinkt'],
  voiceCmdBack: ['terug', 'beginscherm', 'home'],
  voiceCmdRepeat: ['herhaal', 'opnieuw', 'nogmaals'],
  voiceCmdBreak: ['pauze', 'rust'],

  voiceGreet: (name) => `Hoi ${name}! Wat wil je vandaag doen?`,
  voiceStartTask: (label) => `Oké! We gaan ${label} doen!`,
  voiceNextStep: (n, text) => `Stap ${n}: ${text}`,
  voiceAllDone: (task) => `Super! Je hebt ${task} afgerond. Heel goed gedaan!`,
  voiceGoHome: 'Terug naar het beginscherm',
  voiceNotUnderstood: 'Ik verstond dat niet. Tik op een taak.',
  voiceBreakStart: 'Pauzetimer gestart. Vijf minuten.',
  voiceWelcome: (name) => `Welkom ${name}!`,
  breakDone: 'Pauze voorbij. Goed gedaan! Verder gaan?',

  // Caregiver
  caregiverTitle: 'Begeleider',
  signIn: 'Inloggen',
  register: 'Registreren',
  yourName: 'Jouw naam',
  email: 'E-mailadres',
  password: 'Wachtwoord',
  pleaseWait: 'Even wachten…',
  noAccount: 'Nog geen account? Registreer',
  haveAccount: 'Al een account? Inloggen',
  signOut: 'Uitloggen',

  tabClients: '👥 Cliënten',
  tabStats: '📊 Voortgang',
  tabTasks: '✅ Taken',
  tabSettings: '⚙️ Instellingen',

  addClient: '+ Nieuwe cliënt',
  newClient: 'Nieuwe cliënt',
  clientName: 'Naam',
  colour: 'Kleur',
  pinLabel: 'Pincode (4 cijfers)',
  pinPH: '1234',
  notes: 'Aantekeningen',
  notesPH: 'Opmerkingen…',
  saveClient: 'Opslaan',
  cancel: 'Annuleren',
  clientAdded: 'Cliënt toegevoegd!',
  clientSaved: 'Opgeslagen!',
  removeClient: 'Verwijder',
  confirmRemove: 'Deze cliënt verwijderen?',
  viewStats: 'Voortgang',
  pinProtected: '🔒 Pincode ingesteld',

  // Overwhelmed editor
  overwhelmedEditor: 'Vol hoofd — kalmeer activiteiten',
  overwhelmedEditorSub: 'Wat helpt deze cliënt als ze overweldigd zijn? Voeg activiteiten toe.',
  addActivity: '+ Activiteit toevoegen',
  activityName: 'Naam activiteit',
  activityPH: 'bijv. Diep ademhalen',
  activityIcon: 'Icoon',
  saveActivity: 'Opslaan',
  noActivities: 'Nog geen activiteiten. Voeg er een toe!',

  // Med reminders editor
  medEditor: 'Medicijn herinneringen',
  medEditorSub: 'Stel tijden in waarop de cliënt een herinnering krijgt.',
  addMedTime: '+ Tijd toevoegen',
  medTimePH: '08:00',
  medName: 'Naam medicijn (optioneel)',
  medNamePH: 'bijv. Ritalin',
  saveMedTime: 'Opslaan',
  noMedTimes: 'Nog geen herinneringen ingesteld.',
  removeMed: 'Verwijder',

  // Push notification settings
  notifEditor: 'Begeleider meldingen',
  notifEditorSub: 'Voer jouw telefoonnummer of e-mail in zodat cliënten je kunnen bereiken.',
  notifPhone: 'Telefoonnummer (voor SMS)',
  notifEmail: 'E-mailadres (backup)',
  saveNotif: 'Opslaan',
  notifSaved: 'Opgeslagen!',

  // Tasks
  customTasksIntro: 'Maak eigen taken voor jouw cliënten.',
  addTask: '+ Nieuwe taak',
  newTask: 'Nieuwe taak',
  taskName: 'Naam',
  taskNamePH: 'bijv. Fysiotherapie',
  icon: 'Icoon (emoji)',
  stepsLabel: 'Stappen (één per regel)',
  stepsPH: 'Stap 1\nStap 2\nStap 3',
  tipLabel: 'Aanmoediging',
  tipPH: 'Je kunt het!',
  assignTo: 'Koppel aan cliënt',
  allClients: 'Alle cliënten',
  saveTask: 'Opslaan',
  taskAdded: 'Taak toegevoegd!',
  removeTask: 'Verwijder',
  stepsCount: (n) => `${n} stap${n===1?'':'pen'}`,
  customTasksFor: (name) => `Taken voor ${name}`,
  noCustomTasks: 'Nog geen eigen taken.',
  errorTaskFields: 'Vul een naam in en minimaal één stap.',

  // AI assistant
  aiTitle: 'AI Taakenmaker',
  aiSub: 'Beschrijf wat de cliënt moet doen. De AI maakt er een duidelijke taak van.',
  aiPlaceholder: 'bijv. "de cliënt moet \'s ochtends zelfstandig klaar worden voor dagbesteding"',
  aiGenerate: 'Maak taak aan',
  aiGenerating: 'Bezig…',
  aiUseTask: 'Gebruik deze taak',
  aiTryAgain: 'Opnieuw proberen',
  aiError: 'Er ging iets mis. Probeer opnieuw.',

  // Stats
  progressOf: (name) => `Voortgang van ${name}`,
  today: 'Vandaag',
  thisWeek: 'Deze week',
  allTime: 'Totaal',
  moodThisWeek: 'Stemming deze week',
  dailyActivity: 'Dagelijkse taken (14 dagen)',
  recentCompletions: 'Recente afrondingen',
  noneYet: 'Nog geen afrondingen.',
  doneBadge: '✓ Klaar',
};

export const DEFAULT_TASKS = [
  { id:'ochtend',    label:'Ochtend routine',    subtitle:'Begin je dag goed',          tip:'Stap voor stap. Jij kunt dit!',              steps:['Wakker worden en uitrekken','Glas water drinken','Naar toilet gaan','Gezicht wassen','Tanden poetsen','Kleren aantrekken','Ontbijten'] },
  { id:'opruimen',   label:'Kamer opruimen',      subtitle:'Maak je ruimte fijn',         tip:'Een beetje opruimen is al heel goed!',        steps:['Vieze kleren in wasmand','Afval weggooien','Spullen op hun plek','Tafel afvegen','Bed opmaken'] },
  { id:'douchen',    label:'Douchen',             subtitle:'Fris en schoon voelen',       tip:'Warm water voelt heerlijk!',                 steps:['Handdoek en kleren pakken','Douche aanzetten','Haar wassen','Lichaam wassen','Afspoelen','Afdrogen','Kleren aantrekken'] },
  { id:'eten',       label:'Iets eten maken',     subtitle:'Jezelf goed voeden',          tip:'Je verdient lekker eten!',                   steps:['Handen wassen','Bedenken wat je wilt','Eten en spullen pakken','Maaltijd bereiden','Rustig eten','Afwassen'] },
  { id:'medicijnen', label:'Medicijnen nemen',    subtitle:'Gezond blijven',              tip:'Medicijnen nemen is goed voor jezelf!',      steps:['Naar medicijnen gaan','Controleren welke je nodig hebt','Glas water pakken','Medicijnen nemen','Alles opbergen'] },
  { id:'pauze',      label:'Even pauzeren',       subtitle:'Uitrusten en opladen',        tip:'Rusten is net zo belangrijk!',               steps:['Stoppen met wat je doet','Fijne plek zoeken','Langzaam inademen en uitademen','Iets rustgevends doen','5 minuten blijven','Water drinken'] },
  { id:'buiten',     label:'Naar buiten gaan',    subtitle:'Frisse lucht halen',          tip:'Zelfs een korte wandeling is goed!',         steps:['Kleren voor het weer aantrekken','Schoenen aandoen','Sleutels en telefoon','Deur opendoen','Wandelen','Terug naar huis'] },
  { id:'slapen',     label:'Naar bed gaan',       subtitle:'Goed slapen',                 tip:'Goed slapen helpt je morgen!',               steps:['Schermen wegleggen','Tanden poetsen','Pyjama aantrekken','In bed liggen','Langzaam ademen','Ogen sluiten'] },
  { id:'stemming',   label:'Hoe voel ik me?',     subtitle:'Even bij jezelf kijken',      tip:'',                                           steps:[], special:'stemming' },
];
