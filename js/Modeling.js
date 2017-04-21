'use strict';

var scale = chroma.scale(['white', 'blue', 'red', 'yellow']);

var mesh = [];

var initScene, render, applyForce, setMousePosition, mouse_position,
    box_material,
    projector, renderer, render_stats, physics_stats, camera, scene, box, boxes = [];

initScene = function () {

    var world = new World(document.getElementById('viewport'));

    render_stats = new Stats();
    render_stats.domElement.style.position = 'absolute';
    render_stats.domElement.style.top = '1px';
    render_stats.domElement.style.left = '1px';
    render_stats.domElement.style.zIndex = 100;
    document.getElementById('viewport').appendChild(render_stats.domElement);

    scene    = world.scene;
    renderer = world.renderer;
    camera   = world.camera;
    var meshes = [];
    var car = createCar();

    var controls = new function () {
        this.velocity = -2;
        this.wheelAngle = 0.5;
        this.gravity = true;

        this.loosenXRight = 0.0001;
        this.loosenXLeft = 0.0001;

        this.carColor = 0x00FF00;

        this.RenderType = 0;

        this.changeCarColor = function () {
            car.material.color = new THREE.Color(controls.carColor);
        }

        this.changeVelocity = function () {
            // if you add a motor, the current constraint is overridden
            // if you want to rotate set min higher then max
            car.flConstraint.configureAngularMotor(2, 0.1, 0, controls.velocity, 15000);
            car.frConstraint.configureAngularMotor(2, 0.1, 0, controls.velocity, 15000);

            // motor one is for left and right
//                frConstraint.enableAngularMotor(1);

            // motor two is forward and backwards
            car.flConstraint.enableAngularMotor(2);
            car.frConstraint.enableAngularMotor(2);
        }

        this.changeOrientation = function () {
            car.rrConstraint.setAngularLowerLimit({ x: 0, y: controls.wheelAngle, z: 0.1 });
            car.rrConstraint.setAngularUpperLimit({ x: controls.loosenXRight, y: controls.wheelAngle, z: 0 });
            car.rlConstraint.setAngularLowerLimit({ x: controls.loosenXLeft, y: controls.wheelAngle, z: 0.1 });
            car.rlConstraint.setAngularUpperLimit({ x: 0, y: controls.wheelAngle, z: 0 });
        }

        this.changeGravity = function () {
            scene.setGravity(new THREE.Vector3(0, controls.gravity ? -40 : 0, 0));
        }

        this.setRender = function () {
            if (controls.RenderType == 1) {
                world.setStereoEffect();
                renderer = world.renderer;
            } else {
                world.setGlRender();
                renderer = world.renderer;
            }
        }
    };

    var gui = new dat.GUI();
    gui.add(controls, "gravity").onChange(controls.changeGravity);
    gui.addColor(controls, 'carColor').onChange(controls.changeCarColor);
    gui.add(controls, 'velocity', -10, 10).onChange(controls.changeVelocity);
    gui.add(controls, 'wheelAngle', -1, 1).onChange(controls.changeOrientation);
    gui.add(controls, 'loosenXRight', 0, 0.5).step(0.01).onChange(controls.changeOrientation);
    gui.add(controls, 'loosenXLeft', 0, 0.6).step(-0.01).onChange(controls.changeOrientation);
    gui.add(controls, 'RenderType', { StereoEffect : 1, GLEffect : 0 }).onChange(controls.setRender);
    controls.loosenXLeft = 0;
    controls.loosenXRight = 0;

    world.animation(render_stats, mesh);
};


function createWheel(position) {
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

    wheel.rotation.x = Math.PI / 2;
    wheel.castShadow = true;
    wheel.position.copy(position);
    return wheel;
}


function createCar() {
    var car = {};
    var car_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0xff4444, opacity: 0.9, transparent: true }),
        .5, // high friction
        .5 // medium restitution
    );

    // create the car body
    var geom = new THREE.BoxGeometry(15, 4, 4);
    var body = new Physijs.BoxMesh(geom, car_material, 500);
    car.material = car_material;
    body.position.set(5, 5, 5);
    body.castShadow = true;
    scene.add(body);
    mesh.push(body);

    // create the wheels
    var fr = createWheel(new THREE.Vector3(0, 4, 10));
    var fl = createWheel(new THREE.Vector3(0, 4, 0));
    var rr = createWheel(new THREE.Vector3(10, 4, 10));
    var rl = createWheel(new THREE.Vector3(10, 4, 0));

    // add the wheels to the scene
    scene.add(fr)
    mesh.push(fr);
    scene.add(fl);
    mesh.push(fl);
    scene.add(rr);
    mesh.push(rr);
    scene.add(rl);
    mesh.push(rl);

    var frConstraint = createWheelConstraint(fr, body, new THREE.Vector3(0, 4, 8));
    scene.addConstraint(frConstraint);

    var flConstraint = createWheelConstraint(fl, body, new THREE.Vector3(0, 4, 2));
    scene.addConstraint(flConstraint);

    var rrConstraint = createWheelConstraint(rr, body, new THREE.Vector3(10, 4, 8));
    scene.addConstraint(rrConstraint);

    var rlConstraint = createWheelConstraint(rl, body, new THREE.Vector3(10, 4, 2));
    scene.addConstraint(rlConstraint);


    // backwheels don't move themselves and are restriced in their
    // movement. They should be able to rotate along the z-axis
    // same here, if the complete angle is allowed set lower higher
    // than upper.
    // by setting the lower and upper to the same value you can
    // fix the position
    // we can set the x position to 'loosen' the axis for the directional
    rrConstraint.setAngularLowerLimit({ x: 0, y: 0.5, z: 0.1 });
    rrConstraint.setAngularUpperLimit({ x: 0, y: 0.5, z: 0 });
    rlConstraint.setAngularLowerLimit({ x: 0, y: 0.5, z: 0.1 });
    rlConstraint.setAngularUpperLimit({ x: 0, y: 0.5, z: 0 });


    // front wheels should only move along the z axis.
    // we don't need to specify anything here, since
    // that value is overridden by the motors
    frConstraint.setAngularLowerLimit({ x: 0, y: 0, z: 0 });
    frConstraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
    flConstraint.setAngularLowerLimit({ x: 0, y: 0, z: 0 });
    flConstraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });

    // if you add a motor, the current constraint is overridden
    // if you want to rotate set min higher then max
    flConstraint.configureAngularMotor(2, 0.1, 0, -2, 1500);
    frConstraint.configureAngularMotor(2, 0.1, 0, -2, 1500);

    // motor one is for left and right
//                frConstraint.enableAngularMotor(1);

    // motor two is forward and backwards
    flConstraint.enableAngularMotor(2);
    frConstraint.enableAngularMotor(2);

    car.flConstraint = flConstraint;
    car.frConstraint = frConstraint;
    car.rlConstraint = rlConstraint;
    car.rrConstraint = rrConstraint;

    return car;
}

function createWheelConstraint(wheel, body, position) {
    var constraint = new Physijs.DOFConstraint(
        wheel, body, position);

    return constraint;
}

window.onload = initScene;
