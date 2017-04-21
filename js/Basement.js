'use strict';

var World = function (viewpoint) {
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.shadowMapEnabled = true;
    viewpoint.appendChild(renderer.domElement);

    this.mouse = new THREE.Vector2();
    this.mouse.click = false;
    this.mouse.down  = false;
    var thiz = this;
    var onMouseDown = function (event) {
        //event.preventDefault();
        thiz.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        thiz.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
        thiz.mouse.click = true;
        thiz.mouse.down = true;
    }
    var onMouseUp = function (event) {
        //event.preventDefault();
        thiz.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        thiz.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
        thiz.mouse.click = false;
    }
    document.addEventListener( 'mousedown', onMouseDown, false );
    document.addEventListener( 'mousemove', onMouseUp,   false );

    this.glRenderer = renderer;
    this.renderer = renderer;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene = new Physijs.Scene({reportSize: 10, fixedTimeStep: 1 / 60});
    this.scene.setGravity(new THREE.Vector3(0, -40, 0));
    this.createLight();
    this.createCamera();
    this.createGround();
}

World.prototype.setGlRender = function () {
    this.renderer = this.glRenderer;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
}

World.prototype.setStereoEffect = function () {
    this.renderer = new THREE.StereoEffect(this.glRenderer);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
}

World.prototype.createLight = function () {
    var light = new THREE.SpotLight(0xFFFFFF);
    light.position.set(120, 70, 100);
    light.castShadow = true;
    light.shadowMapDebug = true;
    light.shadowCameraNear = 10;
    light.shadowCameraFar = 200;
    this.scene.add(light);
    this.light = light;
}

World.prototype.createCamera = function () {
    var camera = new THREE.PerspectiveCamera(
        70,
        1,
        1,
        10000
    );
    var pos = 100;
    camera.position.set(pos, pos, pos);
    camera.lookAt(new THREE.Vector3(0, 0, -20));
    this.scene.add(camera);
    this.camera = camera;
}

World.prototype.createGround = function () {

    var length = 120;
    var width = 120;
    // Materials
    var ground_material = Physijs.createMaterial(
        new THREE.MeshBasicMaterial(),
        1, // high friction
        .7 // low restitution
    );

    // Ground
    var ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(length, 1, width),
        ground_material,
        0 // mass
    );

    ground.receiveShadow = true;

    var borderLeft = new Physijs.BoxMesh(
        new THREE.BoxGeometry(2, 6, width),
        ground_material,
        0 // mass
    );

    borderLeft.position.x = -1 * length / 2 - 1;
    borderLeft.position.y = 2;
    borderLeft.receiveShadow = true;


    ground.add(borderLeft);

    var borderRight = new Physijs.BoxMesh(new THREE.BoxGeometry(2, 6, width),
        ground_material,
        0 // mass
    );
    borderRight.position.x = length / 2 + 1;
    borderRight.position.y = 2;
    borderRight.receiveShadow = true;

    ground.add(borderRight);


    var borderBottom = new Physijs.BoxMesh(
        new THREE.BoxGeometry(width - 1, 6, 2),
        ground_material,
        0 // mass
    );

    borderBottom.position.z = width / 2;
    borderBottom.position.y = -1;
    borderBottom.receiveShadow = true;
    ground.add(borderBottom);

    var borderTop = new Physijs.BoxMesh(
        new THREE.BoxGeometry(width, 6, 2),
        ground_material,
        0 // mass
    );

    borderTop.position.z = -width / 2;
    borderTop.position.y = 2;

    borderTop.receiveShadow = true;

    ground.position.x = 0;
    ground.position.z = -20;
    ground.add(borderTop);

    ground.receiveShadow = true;

    this.scene.add(ground);
    this.ground = ground;

    var gridHelper = new THREE.GridHelper(500, 40); // 500 is grid size, 20 is grid step
    this.scene.add(gridHelper);
}

function createW(position) {
    var wheel_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0x444444, opacity: 0.9, transparent: true }),
        1.0, // high friction
        .5 // medium restitution
    );

    var wheel_geometry = new THREE.CylinderGeometry(4, 4, 2, 10);
    var wheel = new Physijs.CylinderMesh(
        wheel_geometry,
        wheel_material,
        100
    );

    //wheel.rotation.x = Math.PI / 2;
    wheel.castShadow = true;
    wheel.position.copy(position);
    return wheel;
}

World.prototype.animation = function (render_stats, mesh) {
    var world = this;
    var updateControls = function () {
        var vector = new THREE.Vector3(world.mouse.x, world.mouse.y, 0.5);
        vector.unproject(world.camera);
        var ray = new THREE.Raycaster(world.camera.position,
            vector.sub(world.camera.position).normalize());
        var hits = ray.intersectObjects(mesh);

        if (world.mouse.down) {
            if (hits.length > 0) {
                hits[0].object.material.color = new THREE.Color(0xFFFFFF);
                var t = createW(hits[0].face.normal);
                hits[0].object.add(t);
                mesh.push(t);
                //world.scene.remove(hits[0].object);
            }
        }
        world.mouse.down = false;
    }
    var render = function () {
        requestAnimationFrame(render);
        updateControls();
        var width = window.innerWidth;
        var height = window.innerHeight;

        world.renderer.render(world.scene, world.camera);
        render_stats.update();
        world.scene.simulate(undefined, 2);
    }
    requestAnimationFrame(render);
    scene.simulate();
}
