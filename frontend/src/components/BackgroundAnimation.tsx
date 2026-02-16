import { useEffect, useRef, useCallback } from 'react';
import type { JSX } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  baseOpacity: number;
}

export default function BackgroundAnimation(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const meteorsRef = useRef<{ x: number; y: number; speed: number; length: number }[]>([]);

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        baseOpacity: Math.random() * 0.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        baseOpacity: Math.random() * 0.1 + 0.05,
      });
    }
    particlesRef.current = particles;
  }, []);

  const addMeteor = useCallback((width: number) => {
    meteorsRef.current.push({
      x: Math.random() * width,
      y: 0,
      speed: Math.random() * 3 + 2,
      length: Math.random() * 80 + 40,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars(canvas.width, canvas.height);
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const meteorInterval = setInterval(() => {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        addMeteor(canvas.width);
      }
    }, 3000);

    const animate = () => {
      timeRef.current += 0.016;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const colors = isDark 
        ? [
            { r: 15, g: 23, b: 42 },
            { r: 30, g: 41, b: 59 },
            { r: 51, g: 65, b: 85 },
          ]
        : [
            { r: 238, g: 242, b: 255 },
            { r: 243, g: 244, b: 246 },
            { r: 255, g: 255, b: 255 },
          ];

      const gradient = ctx.createLinearGradient(
        0, 
        0, 
        canvas.width * (0.5 + 0.3 * Math.sin(timeRef.current * 0.1)), 
        canvas.height * (0.5 + 0.3 * Math.cos(timeRef.current * 0.1))
      );

      gradient.addColorStop(0, 'rgb(' + colors[0].r + ', ' + colors[0].g + ', ' + colors[0].b + ')');
      gradient.addColorStop(0.5, 'rgb(' + colors[1].r + ', ' + colors[1].g + ', ' + colors[1].b + ')');
      gradient.addColorStop(1, 'rgb(' + colors[2].r + ', ' + colors[2].g + ', ' + colors[2].b + ')');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isDark) {
        starsRef.current.forEach((star) => {
          star.opacity = star.baseOpacity + Math.sin(timeRef.current * star.twinkleSpeed + star.twinkleOffset) * 0.2;
          
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + star.opacity + ')';
          ctx.fill();
          
          const glowGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 3
          );
          glowGradient.addColorStop(0, 'rgba(255, 255, 255, ' + (star.opacity * 0.3) + ')');
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(star.x - star.size * 3, star.y - star.size * 3, star.size * 6, star.size * 6);
        });

        meteorsRef.current = meteorsRef.current.filter((meteor) => {
          meteor.y += meteor.speed;
          meteor.x += meteor.speed * 0.5;
          
          if (meteor.y > canvas.height || meteor.x > canvas.width) {
            return false;
          }

          const meteorGradient = ctx.createLinearGradient(
            meteor.x, meteor.y,
            meteor.x - meteor.length, meteor.y - meteor.length * 0.5
          );
          meteorGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          meteorGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.beginPath();
          ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(meteor.x - meteor.length, meteor.y - meteor.length * 0.5);
          ctx.strokeStyle = meteorGradient;
          ctx.lineWidth = 2;
          ctx.stroke();

          return true;
        });

      } else {
        const waveCount = 5;
        for (let i = 0; i < waveCount; i++) {
          const waveOffset = i * 0.5;
          const waveAmplitude = 15 - i * 2;
          const waveY = canvas.height * (0.3 + i * 0.15);
          
          ctx.beginPath();
          ctx.moveTo(0, waveY);
          
          for (let x = 0; x <= canvas.width; x += 10) {
            const y = waveY + 
              Math.sin(x * 0.005 + timeRef.current * 0.5 + waveOffset) * waveAmplitude +
              Math.sin(x * 0.01 + timeRef.current * 0.3 + waveOffset) * waveAmplitude * 0.5;
            ctx.lineTo(x, y);
          }
          
          ctx.lineTo(canvas.width, canvas.height);
          ctx.lineTo(0, canvas.height);
          ctx.closePath();
          
          const alpha = 0.03 + i * 0.01;
          ctx.fillStyle = 'rgba(79, 70, 229, ' + alpha + ')';
          ctx.fill();
        }

        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height * 0.35 + 
            Math.sin(x * 0.008 + timeRef.current * 0.7) * 8 +
            Math.sin(x * 0.015 + timeRef.current * 0.5) * 4;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      particlesRef.current.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });

      particlesRef.current.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark 
          ? 'rgba(129, 140, 248, ' + particle.baseOpacity + ')'
          : 'rgba(79, 70, 229, ' + particle.baseOpacity + ')';
        ctx.fill();
      });

      const maxDistance = 120;
      particlesRef.current.forEach((particle, i) => {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const other = particlesRef.current[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = isDark 
              ? 'rgba(129, 140, 248, ' + opacity + ')'
              : 'rgba(79, 70, 229, ' + opacity + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
      clearInterval(meteorInterval);
    };
  }, [initStars, initParticles, addMeteor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ opacity: 1 }}
    />
  );
}
