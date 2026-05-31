(function () {
  const MODEL_SCREEN_WIDTH_PERCENT = 56;
  const EDGE_THRESHOLD_ANGLE = 20;
  const EDGE_LINE_OPACITY = 0.92;

  function initCompanion() {
    const mount = document.querySelector('[data-david-companion]');
    if (!mount || !window.THREE || !window.DAVID_MODEL_DATA) return;

    const canvas = mount.querySelector('.davidCompanionCanvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
    camera.position.set(0, 0, 180);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0xffffff, 0.24));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.48);
    keyLight.position.set(3.5, 5.2, 7.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.34);
    rimLight.position.set(-4.5, 2.5, 4.5);
    scene.add(rimLight);

    const model = window.DAVID_MODEL_DATA;
    const closeMesh = createDavidMesh(model.close.vertices, model.close.faces);
    const openMesh = createDavidMesh(model.open.vertices, model.open.faces);
    openMesh.visible = false;
    group.add(closeMesh);
    group.add(openMesh);
    centerAndScale(group);

    let targetYaw = 0;
    let targetPitch = 0;
    let yaw = 0;
    let pitch = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let frame = 0;
    let speaking = false;
    let mouthOpen = false;
    let speakingTimer = null;
    let lastDialogueText = '';
    let voiceTimer = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const aspect = width / height;

      renderer.setSize(width, height, false);
      camera.left = -50;
      camera.right = 50;
      camera.top = 50 / aspect;
      camera.bottom = -50 / aspect;
      camera.updateProjectionMatrix();
    }

    function animate() {
      frame++;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (mouseX - cx) / Math.max(1, rect.width / 2);
      const ny = (mouseY - cy) / Math.max(1, rect.height / 2);

      targetYaw = Math.max(-0.52, Math.min(0.52, nx * 0.44));
      targetPitch = Math.max(-0.24, Math.min(0.24, ny * 0.2));
      yaw += (targetYaw - yaw) * 0.045;
      pitch += (targetPitch - pitch) * 0.045;

      group.rotation.x = pitch;
      group.rotation.y = yaw;
      if (speaking && frame % 9 === 0) mouthOpen = !mouthOpen;
      if (!speaking) mouthOpen = false;
      closeMesh.visible = !mouthOpen;
      openMesh.visible = mouthOpen;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function setSpeaking(active, duration) {
      speaking = !!active;
      window.clearTimeout(speakingTimer);
      if (active && duration) {
        speakingTimer = window.setTimeout(() => {
          speaking = false;
        }, duration);
      }
    }

    window.setDavidCompanionSpeaking = setSpeaking;

    const dialogueText = mount.querySelector('#dialogueText');
    if (dialogueText) {
      const companionVoiceEnabled = document.body.dataset.companionVoice !== 'off';

      function handleDialogueChange() {
        const text = dialogueText.textContent.trim();
        if (!text) {
          setSpeaking(false);
          lastDialogueText = '';
          return;
        }
        const duration = window.DAVIDVoice
          ? window.DAVIDVoice.estimateMouthDuration(text)
          : Math.max(320, Math.min(2800, Math.max(760, text.length * 42)) - 1000);
        setSpeaking(true, duration);
        const previousDialogueText = lastDialogueText;
        window.clearTimeout(voiceTimer);
        voiceTimer = window.setTimeout(() => {
          if (companionVoiceEnabled && window.DAVIDVoice && text !== previousDialogueText) {
            setSpeaking(true, window.DAVIDVoice.estimateMouthDuration(text));
            Promise.race([
              window.DAVIDVoice.speak(text),
              new Promise(resolve => window.setTimeout(resolve, Math.min(4200, Math.max(900, text.length * 85))))
            ]).then(() => {
              if (dialogueText.textContent.trim() === text) setSpeaking(false);
            });
          }
        }, 120);
        lastDialogueText = text;
      }
      const observer = new MutationObserver(handleDialogueChange);
      observer.observe(dialogueText, { childList: true, characterData: true, subtree: true });
      window.setTimeout(handleDialogueChange, 350);
    }

    window.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });
    window.addEventListener('resize', resize);

    resize();
    requestAnimationFrame(animate);
  }

  function createDavidMesh(vertices, faces) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(faces.flat());
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshToonMaterial({
        color: 0x020202,
        side: THREE.DoubleSide
      })
    );
    mesh.frustumCulled = false;

    const edgeGeometry = new THREE.EdgesGeometry(geometry, EDGE_THRESHOLD_ANGLE);
    const edgeLines = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: EDGE_LINE_OPACITY,
        depthTest: true,
        depthWrite: false
      })
    );
    edgeLines.renderOrder = 5;
    mesh.add(edgeLines);

    return mesh;
  }

  function centerAndScale(object) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    object.position.sub(center);

    const width = size.x || 1;
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const dimensionForScale = Math.max(width, maxDimension * 0.65);
    object.scale.setScalar(MODEL_SCREEN_WIDTH_PERCENT / dimensionForScale);

    object.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(object);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    object.position.sub(scaledCenter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompanion);
  } else {
    initCompanion();
  }
})();
