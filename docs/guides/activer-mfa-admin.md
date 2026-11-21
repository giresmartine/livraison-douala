# Activer la vérification en deux étapes de l'admin

Chaque admin doit utiliser une application d'authentification TOTP. Les actions de devis sensibles exigent une session récente ; si un facteur MFA est activé, la base et le serveur exigent aussi le niveau `aal2`.

## Activer le TOTP sur le projet de développement

1. Dans Supabase, ouvre le projet **livraison-douala-dev**.
2. Va dans **Authentication → Settings → Multi-Factor Authentication**.
3. Vérifie que le facteur **Authenticator app (TOTP)** est autorisé.
4. Enregistre le réglage sans rendre la MFA facultative pour les comptes admin de production.
5. Lance le site local et connecte-toi avec le compte admin de test. Ses identifiants sont dans `web/.dev-accounts.txt`.
6. Ouvre `/fr/ops/securite` (ou `/en/ops/securite`), sélectionne **Configurer une application d’authentification**, puis scanne le QR code avec une application TOTP.
7. Saisis le code à six chiffres affiché dans l’application et sélectionne **Vérifier et activer**.
8. Vérifie que la page indique que la vérification en deux étapes est active. Conserve une méthode de récupération conforme à la politique de ton organisation.

Le QR code et la clé sont affichés uniquement dans la session de configuration de l'admin. Ne les partage pas et ne les capture pas. Si la page est fermée avant la validation, recommence la configuration.

## À faire par toi pour un vrai projet

- Dans le projet Supabase de production, autorise le TOTP et configure le niveau d'assurance minimal attendu pour les admins.
- Chaque compte admin réel doit se connecter et s'inscrire à la MFA depuis `/fr/ops/securite`.
- Teste une action admin avec un facteur vérifié : elle doit nécessiter une nouvelle vérification MFA et la session doit atteindre `aal2`.
- Conserve les moyens de récupération conformément à ta politique interne.

Le code vérifie déjà les facteurs inscrits et refuse les actions sensibles si un compte avec MFA n'a pas une session AAL2. L'enrôlement réel et l'activation dans les réglages Supabase restent à effectuer par le propriétaire du projet ; le dépôt ne peut pas activer un facteur à ta place.
