import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    
    // Shared geometry and material for performance
    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1,
    });
  }

  /**
   * Spawns a burst of particles at the given position.
   * @param {THREE.Vector3} position 
   * @param {number} color Hex color or THREE.Color
   * @param {number} count Number of particles
   */
  spawnExplosion(position, color = 0xffffff, count = 20) {
    const mat = this.material.clone();
    mat.color.set(color);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.position.copy(position);
      
      // Random spread direction
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2 + 0.5, // Bias upwards slightly
        (Math.random() - 0.5) * 2
      ).normalize();
      
      const speed = Math.random() * 5 + 3;
      
      this.scene.add(mesh);
      
      this.particles.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        life: 1.0,     // 1 second lifetime
        maxLife: 1.0,
        scale: Math.random() * 0.5 + 0.5
      });
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Gravity and movement
      p.velocity.y -= 9.8 * deltaTime; // Gravity
      
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      
      // Rotation
      p.mesh.rotation.x += p.velocity.x * deltaTime;
      p.mesh.rotation.y += p.velocity.y * deltaTime;
      
      // Shrink over time
      const scale = (p.life / p.maxLife) * p.scale;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  dispose() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
    this.geometry.dispose();
    this.material.dispose();
  }
}
