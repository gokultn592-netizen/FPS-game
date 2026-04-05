const GAMEDATA = {
    levels: [],
    characters: [
        { id: 1, name: "Adam", cost: 0, speed: 1.0, color: 0xdfb895 },
        { id: 2, name: "Kelly", cost: 500, speed: 1.2, color: 0xe8c39e },
        { id: 3, name: "Hayato", cost: 1000, speed: 1.05, color: 0xd2a679 },
        { id: 4, name: "Alok", cost: 2000, speed: 1.15, color: 0xc68c53 },
        { id: 5, name: "Chrono", cost: 2500, speed: 1.1, color: 0xdfb895 },
        { id: 6, name: "Skyler", cost: 2500, speed: 1.1, color: 0xdfb895 },
        { id: 7, name: "Wukong", cost: 3000, speed: 1.0, color: 0x8b5a2b },
        { id: 8, name: "K", cost: 3500, speed: 1.05, color: 0xdfb895 },
        { id: 9, name: "Moco", cost: 1200, speed: 1.1, color: 0xc19a6b },
        { id: 10, name: "Maxim", cost: 1200, speed: 1.2, color: 0xdfb895 },
        { id: 11, name: "Kla", cost: 1500, speed: 1.25, color: 0xdfb895 },
        { id: 12, name: "Antonio", cost: 1800, speed: 0.9, color: 0xdfb895 },
        { id: 13, name: "Miguel", cost: 2200, speed: 1.0, color: 0xdfb895 },
        { id: 14, name: "Paloma", cost: 1500, speed: 1.0, color: 0xdfb895 },
        { id: 15, name: "Laura", cost: 1700, speed: 1.0, color: 0xdfb895 },
        { id: 16, name: "Rafael", cost: 2000, speed: 1.0, color: 0xdfb895 },
        { id: 17, name: "A124", cost: 2500, speed: 1.1, color: 0xaaaaaa },
        { id: 18, name: "Shani", cost: 1500, speed: 1.0, color: 0xdfb895 },
        { id: 19, name: "Notora", cost: 1600, speed: 1.2, color: 0xdfb895 },
        { id: 20, name: "Steffie", cost: 2000, speed: 1.0, color: 0xdfb895 }
    ],
    guns: [
        { id: 1, name: "G18", cost: 0, fireRate: 0.3, mag: 15, range: 1.0, color: 0x222222 },
        { id: 2, name: "UMP", cost: 500, fireRate: 0.15, mag: 30, range: 2.0, color: 0x333333 },
        { id: 3, name: "MP5", cost: 800, fireRate: 0.1, mag: 40, range: 1.5, color: 0x444444 },
        { id: 4, name: "AK47", cost: 1500, fireRate: 0.15, mag: 30, range: 2.0, color: 0x5c4033 },
        { id: 5, name: "M4A1", cost: 1500, fireRate: 0.12, mag: 30, range: 2.0, color: 0x111111 },
        { id: 6, name: "SCAR", cost: 1800, fireRate: 0.14, mag: 30, range: 2.5, color: 0xbd9a7a },
        { id: 7, name: "GROZA", cost: 2500, fireRate: 0.12, mag: 30, range: 2.5, color: 0x101010 },
        { id: 8, name: "FAMAS", cost: 1200, fireRate: 0.2, mag: 30, range: 2.0, color: 0x3b3b3b },
        { id: 9, name: "XM8", cost: 1600, fireRate: 0.14, mag: 30, range: 2.0, color: 0x224422 },
        { id: 10, name: "AUG", cost: 2000, fireRate: 0.13, mag: 35, range: 3.0, color: 0x1b1b1b },
        { id: 11, name: "PARAFL", cost: 2200, fireRate: 0.2, mag: 20, range: 2.0, color: 0x42382e },
        { id: 12, name: "SKS", cost: 1800, fireRate: 0.4, mag: 10, range: 4.0, color: 0x8a5a44 },
        { id: 13, name: "SVD", cost: 2600, fireRate: 0.35, mag: 10, range: 4.0, color: 0x333333 },
        { id: 14, name: "WOODPECKER", cost: 2800, fireRate: 0.3, mag: 12, range: 4.0, color: 0x7c4935 },
        { id: 15, name: "MP40", cost: 3000, fireRate: 0.08, mag: 20, range: 1.5, color: 0x1a1a1a },
        { id: 16, name: "THOMPSON", cost: 2500, fireRate: 0.1, mag: 42, range: 1.5, color: 0x553311 },
        { id: 17, name: "VECTOR", cost: 3200, fireRate: 0.05, mag: 25, range: 1.2, color: 0x111111 },
        { id: 18, name: "MAG7", cost: 2000, fireRate: 0.5, mag: 8, range: 1.0, color: 0x222222 },
        { id: 19, name: "M1887", cost: 4000, fireRate: 0.8, mag: 2, range: 1.0, color: 0x503010 },
        { id: 20, name: "AWM", cost: 5000, fireRate: 1.5, mag: 5, range: 8.0, color: 0x3c4a3e }
    ]
};

for (let i = 1; i <= 1000; i++) {
    GAMEDATA.levels.push({
        id: i,
        name: `OPERATION ${i}`,
        targets: Math.floor(i * 1.5) + 5, // Starts at 6, builds up
        timeLimit: Math.floor(30 + i * 2), // Level time from 32s up to thousands
        colorTheme: i % 3 === 0 ? 0xff0055 : (i % 3 === 1 ? 0x00f0ff : 0x4aff7c)
    });
}
