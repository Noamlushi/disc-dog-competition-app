// Native fetch in Node 18+

async function debug() {
    try {
        // 1. Get Competitions
        console.log('Fetching competitions...');
        const res = await fetch('http://localhost:3000/api/competitions');
        const comps = await res.json();

        if (comps.length === 0) {
            console.log('No competitions found.');
            return;
        }

        const lastComp = comps[comps.length - 1];
        console.log(`Inspecting Competition: ${lastComp.name} (${lastComp._id})`);

        // 2. Get Teams
        const res2 = await fetch(`http://localhost:3000/api/competitions/${lastComp._id}/teams`);
        const teams = await res2.json();

        console.log(`Found ${teams.length} teams.`);

        teams.forEach(t => {
            const fsRuns = t.registrations.filter(r => r.runType === 'Freestyle');
            if (fsRuns.length > 0) {
                console.log(`\nTeam: ${t.ownerName} - ${t.dogName}`);
                fsRuns.forEach(r => {
                    console.log('Freestyle Data:', JSON.stringify(r.freestyle, null, 2));
                    console.log('Total Score:', r.totalScore);
                });
            }
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

debug();
