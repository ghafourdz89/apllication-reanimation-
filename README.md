# Assistant RCP

Application mobile (Android / iOS, React Native + Expo) d'aide à la réanimation cardio-pulmonaire.

> ⚠️ Outil d'aide uniquement. Ne remplace ni la formation ni les protocoles en vigueur.

## Fonctionnalités

L'application guide pas à pas selon l'algorithme de réanimation avancée de l'adulte (ERC) :

- **Analyse du rythme** toutes les 2 minutes (passage automatique, vibration) : choquable (FV / TV sans pouls) ou non choquable (asystolie / AESP).
- **Rythme choquable** : étapes du choc (énergie, sécurité), reprise immédiate du massage 2 min.
  - Adrénaline 1 mg **après le 3e choc**, puis toutes les 3-5 min.
  - Amiodarone **300 mg après le 3e choc**, **150 mg après le 5e choc**.
- **Rythme non choquable** : adrénaline 1 mg **dès que possible**, puis toutes les 3-5 min. Pas d'amiodarone.
- Consignes du cycle : massage de qualité, voie IV/IO, voie aérienne et capnographie (massage continu si intubé).
- **Causes réversibles 4H / 4T** à cocher.
- **RACS** : liste des soins post-réanimation, bouton « récidive d'arrêt ».
- **Métronome** 110/min (coupé pendant l'analyse), **journal horodaté**, écran maintenu allumé.

## Utiliser l'application dans le navigateur (iPhone et Android)

Adresse : https://ghafourdz89.github.io/apllication-reanimation-/

Ouvrez-la dans Safari (iPhone) ou Chrome (Android), puis **Partager → Sur l'écran d'accueil** (iPhone) ou **⋮ → Ajouter à l'écran d'accueil** (Android) pour l'avoir comme une application.
Elle est republiée automatiquement à chaque modification de la branche `main` (`.github/workflows/web.yml`).

## Lancer l'application en développement

```bash
npm install
npm start
```

Puis scannez le QR code avec l'application **Expo Go** sur votre téléphone (Android ou iOS).

## Tests

```bash
npm test
```

## Structure

- `App.js` : écran principal (interface).
- `src/algorithme.js` : algorithme ERC (étapes, chocs, adrénaline, amiodarone).
- `src/rcp.js` : constantes et formatage des durées.
- `src/*.test.mjs` : tests (`npm test`).
- `assets/bip.wav` : son du métronome.

## Obtenir un APK Android (sans ordinateur de développement)

1. Créez un compte gratuit sur https://expo.dev.
2. Sur expo.dev : **Create a project**, puis dans **Project settings → GitHub**, reliez le dépôt `apllication-reanimation-`.
3. Dans l'onglet **Builds**, lancez un build **Android** avec le profil **preview**.
4. À la fin du build (environ 10-20 min), téléchargez l'APK depuis le lien ou le QR code et installez-le sur le téléphone (autorisez les « sources inconnues »).
