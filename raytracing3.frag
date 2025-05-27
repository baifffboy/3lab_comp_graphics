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

struct STetrahedron {
    vec3 Center;
    float Size;
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
SMaterial green = SMaterial(vec3(0.0, 1.0, 0.0), 0.1, 0.1);

const SPlane[6] planes = SPlane[6](
    SPlane(vec3(0,-1,0), vec3(0,1,0), floorMat),  // Пол
    SPlane(vec3(0,1,0), vec3(0,-1,0), ceilingMat), // Потолок
    SPlane(vec3(-1,0,0), vec3(1,0,0), wallMat),    // Левая стена
    SPlane(vec3(1,0,0), vec3(-1,0,0), wallMat),    // Правая стена
    SPlane(vec3(0,0,-1), vec3(0,0,1), wallMat),    // Задняя стена
    SPlane(vec3(0,0,1), vec3(0,0,-1), wallMat)     // Передняя стена
);

const STetrahedron[2] tetrahedrons = STetrahedron[2](
    STetrahedron(vec3(0.0, -0.2, -1.0), 0.7, mirrorMat),  // Первый тетраэдр
    STetrahedron(vec3(-0.4, 0.6, -1.0), 0.5, mirrorMat)  // Тетраэдр на месте второго кубика
);

// Функция пересечения луча с треугольником
bool IntersectTriangle(vec3 v0, vec3 v1, vec3 v2, SRay ray, out SHitInfo hit) {
    vec3 e1 = v1 - v0;
    vec3 e2 = v2 - v0;
    vec3 h = cross(ray.Direction, e2);
    float a = dot(e1, h);
    
    if (a > -0.0001 && a < 0.0001)
        return false;
    
    float f = 1.0 / a;
    vec3 s = ray.Origin - v0;
    float u = f * dot(s, h);
    
    if (u < 0.0 || u > 1.0)
        return false;
    
    vec3 q = cross(s, e1);
    float v = f * dot(ray.Direction, q);
    
    if (v < 0.0 || u + v > 1.0)
        return false;
    
    float t = f * dot(e2, q);
    
    if (t > 0.0001) {
        hit.Distance = t;
        hit.Position = ray.Origin + ray.Direction * t;
        hit.Normal = normalize(cross(e1, e2));
        return true;
    }
    
    return false;
}

// Функция пересечения луча с тетраэдром
bool IntersectTetrahedron(STetrahedron tetra, SRay ray, out SHitInfo hit) {
    // Определяем вершины тетраэдра
    float size = tetra.Size;
    vec3 center = tetra.Center;
    
    // Вершины тетраэдра (правильная пирамида)
    vec3 v0 = center + vec3(0.0, size/2.0, 0.0);        // Верхняя вершина
    vec3 v1 = center + vec3(-size, -size/2.0, -size);   // Основание 1
    vec3 v2 = center + vec3(size, -size/2.0, -size);    // Основание 2
    vec3 v3 = center + vec3(0.0, -size/2.0, size);      // Основание 3
    
    // Проверяем пересечение с каждой гранью тетраэдра
    SHitInfo tempHit;
    hit.Distance = 1e10;
    bool hasHit = false;
    
    // Грани тетраэдра
    if (IntersectTriangle(v0, v1, v2, ray, tempHit) && tempHit.Distance < hit.Distance) {
        hit = tempHit;
        hasHit = true;
    }
    if (IntersectTriangle(v0, v2, v3, ray, tempHit) && tempHit.Distance < hit.Distance) {
        hit = tempHit;
        hasHit = true;
    }
    if (IntersectTriangle(v0, v3, v1, ray, tempHit) && tempHit.Distance < hit.Distance) {
        hit = tempHit;
        hasHit = true;
    }
    if (IntersectTriangle(v1, v3, v2, ray, tempHit) && tempHit.Distance < hit.Distance) {
        hit = tempHit;
        hasHit = true;
    }
    
    if (hasHit) {
        hit.Material = tetra.Material;
        // Убедимся, что нормаль направлена наружу
        if (dot(hit.Normal, ray.Direction) > 0.0) {
            hit.Normal = -hit.Normal;
        }
        return true;
    }
    
    return false;
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

bool InShadow(vec3 position, vec3 lightPos, SPlane[6] planes, STetrahedron[2] tetrahedrons) {
    SRay shadowRay;
    shadowRay.Origin = position + 0.001 * normalize(lightPos - position);
    shadowRay.Direction = normalize(lightPos - position);
    float lightDist = length(lightPos - position);
    
    SHitInfo hit;
    for(int i = 0; i < 2; i++) {
        if(IntersectTetrahedron(tetrahedrons[i], shadowRay, hit) && hit.Distance < lightDist) {
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
    
    // Проверяем тетраэдры
    for(int i = 0; i < 2; i++) {
        SHitInfo tempHit;
        if(IntersectTetrahedron(tetrahedrons[i], reflectedRay, tempHit) && tempHit.Distance < reflectedHit.Distance) {
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
    
    // Сначала проверяем тетраэдры
    for(int i = 0; i < 2; i++) {
        SHitInfo hit;
        if(IntersectTetrahedron(tetrahedrons[i], ray, hit) && hit.Distance < closestHit.Distance) {
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
            
            if(InShadow(closestHit.Position, lightPos, planes, tetrahedrons)) {
                color *= 0.5;
            }
        }
        
        FragColor = vec4(color, 1.0);
    } else {
        FragColor = vec4(0.05, 0.05, 0.1, 1.0);
    }
}