#version 430 core
out vec4 FragColor;
in vec2 fragCoord;

uniform vec3 cameraPosition;
uniform vec3 cameraView;
uniform vec3 cameraUp;
uniform vec3 cameraSide;
uniform vec2 cameraScale;

struct SRay {
    vec3 Origin;
    vec3 Direction;
};

struct SMaterial {
    vec3 Color;
    float Specular;
    float Reflection;
};

struct SSphere {
    vec3 Center;
    float Radius;
    SMaterial Material;
};

struct SPlane {
    vec3 Point;
    vec3 Normal;
    SMaterial Material;
};

struct SCube {
    vec3 Center;
    vec3 Size;
    SMaterial Material;
};

struct SHitInfo {
    float Distance;
    vec3 Position;
    vec3 Normal;
    SMaterial Material;
};

// Материалы
SMaterial floorMat = SMaterial(vec3(0.9, 0.9, 0.9), 0.1, 0.2);
SMaterial wallMat = SMaterial(vec3(1.0, 0.0, 0.0), 1.0, 0.1);
SMaterial ceilingMat = SMaterial(vec3(1.0, 1.0, 1.0), 0.1, 0.1);
SMaterial mirrorMat = SMaterial(vec3(0.0), 1.0, 1.0);

const SPlane[6] planes = SPlane[6](
    SPlane(vec3(0,-1,0), vec3(0,1,0), floorMat),  // Пол
    SPlane(vec3(0,1,0), vec3(0,-1,0), ceilingMat), // Потолок
    SPlane(vec3(-1,0,0), vec3(1,0,0), wallMat),    // Левая стена
    SPlane(vec3(1,0,0), vec3(-1,0,0), wallMat),    // Правая стена
    SPlane(vec3(0,0,-1), vec3(0,0,1), wallMat),    // Задняя стена
    SPlane(vec3(0,0,1), vec3(0,0,-1), wallMat)     // Передняя стена
);

const SCube[2] cubes = SCube[2](
    SCube(vec3(0.0, -0.6, -1.0), vec3(0.7), mirrorMat), // Кубик на месте первой сферы
    SCube(vec3(-0.4, 0.3, -1.0), vec3(0.9), mirrorMat)  // Кубик на месте второй сферы
);

// Функция пересечения луча с кубом (AABB)
bool IntersectCube(SCube cube, SRay ray, out SHitInfo hit) {
    vec3 minBounds = cube.Center - cube.Size * 0.5;
    vec3 maxBounds = cube.Center + cube.Size * 0.5;
    
    vec3 invDir = 1.0 / ray.Direction;
    vec3 t0s = (minBounds - ray.Origin) * invDir;
    vec3 t1s = (maxBounds - ray.Origin) * invDir;
    
    vec3 tsmaller = min(t0s, t1s);
    vec3 tbigger = max(t0s, t1s);
    
    float tmin = max(tsmaller.x, max(tsmaller.y, tsmaller.z));
    float tmax = min(tbigger.x, min(tbigger.y, tbigger.z));
    
    if (tmax < tmin || tmax < 0.0) {
        return false;
    }
    
    float t = tmin > 0.0 ? tmin : tmax;
    if (t < 0.0) return false;
    
    hit.Distance = t;
    hit.Position = ray.Origin + ray.Direction * t;
    
    // Вычисляем нормаль в точке пересечения
    vec3 localPos = (hit.Position - cube.Center) / cube.Size;
    vec3 absLocalPos = abs(localPos);
    
    if (absLocalPos.x > absLocalPos.y && absLocalPos.x > absLocalPos.z) {
        hit.Normal = vec3(sign(localPos.x), 0.0, 0.0);
    } else if (absLocalPos.y > absLocalPos.z) {
        hit.Normal = vec3(0.0, sign(localPos.y), 0.0);
    } else {
        hit.Normal = vec3(0.0, 0.0, sign(localPos.z));
    }
    
    hit.Material = cube.Material;
    return true;
}

bool IntersectPlane(SPlane plane, SRay ray, out SHitInfo hit) {
    float denom = dot(plane.Normal, ray.Direction);
    if(abs(denom) > 0.0001) {
        vec3 p0l0 = plane.Point - ray.Origin;
        float t = dot(p0l0, plane.Normal) / denom;
        if(t >= 0.0) {
            hit.Distance = t;
            hit.Position = ray.Origin + ray.Direction * t;
            hit.Normal = plane.Normal;
            hit.Material = plane.Material;
            return true;
        }
    }
    return false;
}

SRay GenerateRay() {
    vec2 coords = fragCoord * cameraScale;
    vec3 direction = normalize(cameraView + cameraSide * coords.x + cameraUp * coords.y);
    return SRay(cameraPosition, direction);
}

bool InShadow(vec3 position, vec3 lightPos, SPlane[6] planes, SCube[2] cubes) {
    SRay shadowRay;
    shadowRay.Origin = position + 0.001 * normalize(lightPos - position);
    shadowRay.Direction = normalize(lightPos - position);
    float lightDist = length(lightPos - position);
    
    SHitInfo hit;
    for(int i = 0; i < 2; i++) {
        if(IntersectCube(cubes[i], shadowRay, hit) && hit.Distance < lightDist) {
            // Добавляем мягкие края теней
            float penumbra = 1.0 - smoothstep(0.0, 0.2, hit.Distance/lightDist);
            return penumbra > 0.3;
        }
    }
    
    for(int i = 0; i < 6; i++) {
        if(IntersectPlane(planes[i], shadowRay, hit) && hit.Distance < lightDist) {
            return true;
        }
    }
    
    return false;
}

vec3 CalculateLighting(vec3 position, vec3 normal, SMaterial material, vec3 lightPos) {
    vec3 lightDir = normalize(lightPos - position);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * material.Color;
    
    vec3 viewDir = normalize(cameraPosition - position);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = material.Specular * spec * vec3(1.0);
    
    vec3 ambient = 0.1 * material.Color;
    return ambient + diffuse + specular;
}

vec3 CalculateReflection(SRay ray, SHitInfo hit, int depth) {
    if(depth <= 0) return vec3(0.0);
    
    SRay reflectedRay;
    reflectedRay.Origin = hit.Position + hit.Normal * 0.001;
    reflectedRay.Direction = reflect(ray.Direction, hit.Normal);
    
    SHitInfo reflectedHit;
    reflectedHit.Distance = 1e10;
    
    // Проверяем кубы
    for(int i = 0; i < 2; i++) {
        SHitInfo tempHit;
        if(IntersectCube(cubes[i], reflectedRay, tempHit) && tempHit.Distance < reflectedHit.Distance) {
            reflectedHit = tempHit;
        }
    }
    
    // Проверяем плоскости
    for(int i = 0; i < 6; i++) {
        SHitInfo tempHit;
        if(IntersectPlane(planes[i], reflectedRay, tempHit) && tempHit.Distance < reflectedHit.Distance) {
            reflectedHit = tempHit;
        }
    }
    
    if(reflectedHit.Distance < 1e9) {
        vec3 lightPos = vec3(3.0, 2.0, 0.0); // Тот же источник света
        return CalculateLighting(reflectedHit.Position, reflectedHit.Normal, 
                               reflectedHit.Material, lightPos);
    }
    
    return vec3(0.1);
}

void main() {
    SRay ray = GenerateRay();
    
    // Источник света справа от камеры
    vec3 lightPos = vec3(3.0, 2.0, 0.0);
        
    SHitInfo closestHit;
    closestHit.Distance = 1e10;
    
    // Сначала проверяем кубы
    for(int i = 0; i < 2; i++) {
        SHitInfo hit;
        if(IntersectCube(cubes[i], ray, hit) && hit.Distance < closestHit.Distance) {
            closestHit = hit;
        }
    }
    
    // Затем плоскости комнаты
    for(int i = 0; i < 6; i++) {
        SHitInfo hit;
        if(IntersectPlane(planes[i], ray, hit) && hit.Distance < closestHit.Distance) {
            closestHit = hit;
        }
    }
    
    if(closestHit.Distance < 1e9) {
        vec3 color;
        
        if(closestHit.Material.Reflection > 0.99) {
            // Для зеркальных объектов - только отражение
            color = CalculateReflection(ray, closestHit, 3);
        } else {
            // Для обычных объектов - стандартное освещение
            color = CalculateLighting(closestHit.Position, closestHit.Normal, closestHit.Material, lightPos);
            
            if(InShadow(closestHit.Position, lightPos, planes, cubes)) {
                color *= 0.5;
            }
        }
        
        FragColor = vec4(color, 1.0);
    } else {
        FragColor = vec4(0.05, 0.05, 0.1, 1.0);
    }
}