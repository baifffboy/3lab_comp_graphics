#version 430 core
layout (location = 0) in vec2 vPosition; // Изменили на vec2, так как передаём 2D координаты
out vec2 fragCoord;                     // Передаём координаты во фрагментный шейдер

void main() {
    gl_Position = vec4(vPosition, 0.0, 1.0); // z = 0.0, w = 1.0
    fragCoord = vPosition; // Передаём координаты фрагмента
}