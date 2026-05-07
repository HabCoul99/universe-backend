const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 CONNEXION FIREBASE
// Render va utiliser une variable d'environnement
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// ROUTE : Créer un étudiant
// ============================================
app.post('/api/create-student', async (req, res) => {
  try {
    const {
      matricule, nom, prenom, email,
      telephone, dateNaissance,
      questionSecrete, reponseSecrete,
    } = req.body;

    if (!matricule || !nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        error: 'Matricule, nom, prenom et email obligatoires',
      });
    }

    // Vérifier si le matricule existe déjà
    const existing = await db.collection('users')
      .where('matricule', '==', matricule)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({
        success: false,
        error: 'Ce matricule existe deja',
      });
    }

    // Mot de passe temporaire
    const tempPassword = `${matricule}@Temp123`;

    // 1️⃣ Créer compte Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: tempPassword,
      displayName: `${prenom} ${nom}`,
    });

    // 2️⃣ Créer document Firestore
    await db.collection('users').doc(userRecord.uid).set({
      matricule: matricule,
      firebaseUid: userRecord.uid,
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: telephone || '',
      dateNaissance: dateNaissance || '',
      role: 'etudiant',
      questionSecrete: questionSecrete || '',
      reponseSecrete: reponseSecrete || '',
      doitChangerMdp: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3️⃣ Envoyer email pour changer le mot de passe
    await auth.generatePasswordResetLink(email);

    res.json({
      success: true,
      message: 'Etudiant cree avec succes',
      uid: userRecord.uid,
      tempPassword: tempPassword,
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// ROUTE : Créer un professeur
// ============================================
app.post('/api/create-professor', async (req, res) => {
  try {
    const {
      matricule, nom, prenom, email,
      telephone, dateNaissance,
      questionSecrete, reponseSecrete,
    } = req.body;

    const tempPassword = `${matricule}@Temp123`;

    const userRecord = await auth.createUser({
      email: email,
      password: tempPassword,
      displayName: `${prenom} ${nom}`,
    });

    await db.collection('users').doc(userRecord.uid).set({
      matricule: matricule,
      firebaseUid: userRecord.uid,
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: telephone || '',
      dateNaissance: dateNaissance || '',
      role: 'professeur',
      questionSecrete: questionSecrete || '',
      reponseSecrete: reponseSecrete || '',
      doitChangerMdp: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await auth.generatePasswordResetLink(email);

    res.json({
      success: true,
      uid: userRecord.uid,
      tempPassword: tempPassword,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROUTE : Créer un admin
// ============================================
app.post('/api/create-admin', async (req, res) => {
  try {
    const {
      matricule, nom, prenom, email,
      telephone, role,
    } = req.body;

    const tempPassword = `${matricule}@Temp123`;

    const userRecord = await auth.createUser({
      email: email,
      password: tempPassword,
      displayName: `${prenom} ${nom}`,
    });

    await db.collection('users').doc(userRecord.uid).set({
      matricule: matricule,
      firebaseUid: userRecord.uid,
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: telephone || '',
      role: role || 'admin',
      doitChangerMdp: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      uid: userRecord.uid,
      tempPassword: tempPassword,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROUTE TEST : Vérifier que ça marche
// ============================================
app.get('/', (req, res) => {
  res.json({ message: 'API Universe OK ✅' });
});

// DÉMARRER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur demarre sur le port ${PORT}`);
});