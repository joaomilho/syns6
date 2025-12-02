# Soft launch checklist

[ ] Fix Spotify's login
    Still getting 401s fairly often
[ ] Product Hunt
    [ ] Animated icon e.g https://www.producthunt.com/products/calk-ai
    [ ] Improved images: https://www.producthunt.com/products/welltory
[ ] Synthwave viz
    https://www.reddit.com/r/threejs/comments/gge90b/threejs_retrowavesynthwave_scene_made_for_my/
compo? Or getting AT compo?
[X] Viz config basics
    Add some basic configs for views
[X] Slow lyrics change 
    Debug why the switch of lyrics is slow. 
    Implemewnted background fetch.
[ ] Upgrade vercel
    https://vercel.com/pricing
[ ] Upgrade neon
[ ] Pay for IG?
[ ] Put ads where?

Question:
    - Should I ask people what they want instead?
    - Should viewers also log with Spotify?
[ ] Make /profile
    Be in dropdown (can we keep the URL tho?)
# Done:

[X] Perf review
    Perf review EVERYTHING
    [X] First pass
    [X] Maybe passing the bass/etc instead of micData for 
[X] Pre-lyrics download
    We can check which songs will play next and pre-download lyrics in the client
[X] Mobile web view
    Mobile web view with basic text lyrics.
[X] Avoid screen saver 
    Find a way to avoid the screen to go into screen saver mode from the browser, is that possible? Else what, use a wrapper and make it an app?
[X] AI viz preview
    Automate creating visualization screenshots for the menu.
[X] Trial period
    Allow testing for 1-3 days without CC (only for PH).
[X] Legalities
    TOS
    GRPC
    etc
[X] Lyrics design
    Make lyrics pop a bit more, Bloom?

[X] LavaLamp holes
    The LavaLamp seems to have a clipping problem (aka holes) that's related to limits set in the "MarchingSquares" compo. Hard to tweak to perfection.
[X] Lyrics download bug
    Verify why some lyrics are not loading, eg Texas BigXtahPlug
intense. Allow setting max.
[X] HUE sync
    Fix sequential call to HUE when we have multiple lights. Call all in parallel will fix the issue, or _sequential per light_.
[X] Visualization mode
    Dropdown bleads to the right of the screen
[X] AI creation
    Show "COMING SOON"
[X] Share session
    Don't enable it automatically, wait for user to start a session.
[X] Logo
    Try logo with just circle instead of "syns6" on the left
[x] Viewer mode
    ✅ Refactored from WebRTC/PeerJS to simple polling-based backend system
    ✅ All sharing logic moved to lyrics worker
    ✅ Viewers independently fetch lyrics
    ✅ Backend API with 6-digit codes for easy sharing


# Post soft-launch:

[ ] Replace PeerJS with Vercel WebSocket signaling
    Current issue: PeerJS cloud server (0.peerjs.com) has frequent timeouts
    Solution: Implement custom WebRTC signaling using Vercel's Edge Runtime WebSockets
    - More reliable than PeerJS cloud
    - No external dependencies
    - Full control over signaling logic
    - Can still use self-hosted PeerJS as fallback
    Reference: https://vercel.com/docs/functions/edge-functions/websockets
[ ] Download lyrics DB and populate more
[ ] Check Spotify device
    If phone we can amplify, else amplify can be done by calculating the basic input.
[ ] Get a HUE lightstrip
    Apparently we can set gradients on those
    Which lights have "built-in effects (colorloop or advanced ones like Cosmos, Enchant, Sunbeam, Underwater)"?
[ ] Get other HUE sensor 
    Brainstorm how to integrate them (motion, temperature, etc). IKEA also has those, cheaper now.
[ ] Mobile app
    A mobile app could focus only on lyrics so people in a group 
    can sing together. Could even capture the mic and send to the main view.
[ ] 2 mics
    Figure how to have 2 ins on mac, so we can capture Spotify and then an external mic for proper karaoke.
[ ] DPR
    I've set DPR to 1, but let's consider 2 for really good machines
[ ] HUE lights intensity
    When I'm in my dark bedroom with the projector they interfere in the image when too 
[ ] Lyrics title improvement
    When lyrics have parenthesis (e.g. STILL IN THE PAINT (with LAZER DIM 700 & Bktherula) — Denzel Curry, LAZER DIM 700, Bktherula) we can either SHOW IT DIFFERENTLY (smaller dim) or if it's already part of the artist like this one, not show.
