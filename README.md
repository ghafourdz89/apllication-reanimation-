# Assistant RCP

Application mobile (Android / iOS, React Native + Expo) d'aide à la réanimation cardio-pulmonaire.

> ⚠️ Outil d'aide uniquement. Ne remplace ni la formation ni les protocoles en vigueur.

## Fonctionnalités

- **Chronomètre global** depuis le début de la RCP.
- **Cycles de 2 minutes** avec alerte (vibration + écran rouge) pour l'analyse du rythme et le changement de masseur.
- **Métronome de compressions** à 110/min (son + pulsation visuelle), activable/désactivable. Le son fonctionne même en mode silencieux.
- **Adrénaline 1 mg** : temps écoulé depuis la dernière dose, orange à 3 min, rouge après 5 min.
- **Amiodarone** 300 mg puis 150 mg.
- **Choc / pas de choc**, intubation, RACS, arrêt de la réanimation.
- **Journal horodaté** (temps depuis le début + heure réelle).
- L'écran reste allumé pendant l'utilisation.

## Lancer l'application

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
- `src/rcp.js` : logique pure (minuteries, seuils, doses).
- `src/rcp.test.mjs` : tests de la logique.
- `assets/bip.wav` : son du métronome.

## Obtenir un APK Android (sans ordinateur de développement)

1. Créez un compte gratuit sur https://expo.dev.
2. Sur expo.dev : **Create a project**, puis dans **Project settings → GitHub**, reliez le dépôt `apllication-reanimation-`.
3. Dans l'onglet **Builds**, lancez un build **Android** avec le profil **preview**.
4. À la fin du build (environ 10-20 min), téléchargez l'APK depuis le lien ou le QR code et installez-le sur le téléphone (autorisez les « sources inconnues »).
