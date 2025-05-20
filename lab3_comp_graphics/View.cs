using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using OpenTK;
using OpenTK.Graphics.OpenGL;
using static lab3_comp_graphics.Form1;

namespace lab3_comp_graphics
{
    internal class View
    {
        private int BasicProgramID;
        private uint BasicVertexShader;
        private uint BasicFragmentShader;
        private int vbo_position;
        private int attribute_vpos;
        private int uniform_pos;
        private Vector3 campos;
        private int uniform_aspect;
        private int uniform_cameraPosition;
        private int uniform_cameraView;
        private int uniform_cameraUp;
        private int uniform_cameraSide;
        private int uniform_cameraScale;
        private double aspect;
        private int vao;
        private int cubeColorLoc;
        private int tetraColorLoc;
        private int mirrorCoefLoc;
        private int transparencyLoc;
        private int maxDepthLoc;
        private Vector3 cubeColor = new Vector3(1f, 0.5f, 0.2f);
        private Vector3 tetraColor = new Vector3(0.2f, 0.8f, 0.4f);
        private float mirrorCoef = 0.5f;
        private float transparency = 0.3f;
        private int maxDepth = 3;
        private int vbo;
        void loadShader(String filename, ShaderType type, uint program, out uint address)
        {
            string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, filename);
            if (!File.Exists(path))
                throw new FileNotFoundException($"Shader file not found: {path}");

            address = (uint)GL.CreateShader(type);
            string shaderSource = File.ReadAllText(path);
            GL.ShaderSource((int)address, shaderSource);
            GL.CompileShader(address);

            GL.GetShader(address, ShaderParameter.CompileStatus, out int success);
            
            if (success == 0)
            {
                string log = GL.GetShaderInfoLog((int)address);
                Debug.WriteLine($"Shader compilation error ({type}):\n{log}");
                throw new Exception($"Shader compilation failed: {log}");
            }
            GL.AttachShader(program, address);

        }

        public void InitShaders(bool button1,bool button2,bool button3)
        {
            BasicProgramID = GL.CreateProgram(); // создание объекта программы
            if (button1 == true)
            {
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing.vert", ShaderType.VertexShader, (uint)BasicProgramID,
            out BasicVertexShader);
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing.frag", ShaderType.FragmentShader, (uint)BasicProgramID,
                out BasicFragmentShader);
            }
            if (button2 == true)
            {
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing.vert", ShaderType.VertexShader, (uint)BasicProgramID,
            out BasicVertexShader);
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing2.frag", ShaderType.FragmentShader, (uint)BasicProgramID,
                out BasicFragmentShader);
            }
            if (button3 == true)
            {
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing.vert", ShaderType.VertexShader, (uint)BasicProgramID,
            out BasicVertexShader);
                loadShader("C:\\Users\\ilya_\\OneDrive\\Рабочий стол\\raytracing3.frag", ShaderType.FragmentShader, (uint)BasicProgramID,
                out BasicFragmentShader);
            }
            GL.LinkProgram(BasicProgramID);

            // Получаем локации uniform-переменных
            cubeColorLoc = GL.GetUniformLocation(BasicProgramID, "cubeColor");
            tetraColorLoc = GL.GetUniformLocation(BasicProgramID, "tetraColor");
            mirrorCoefLoc = GL.GetUniformLocation(BasicProgramID, "mirrorCoef");
            transparencyLoc = GL.GetUniformLocation(BasicProgramID, "transparency");
            maxDepthLoc = GL.GetUniformLocation(BasicProgramID, "maxDepth");

            string programLog = GL.GetProgramInfoLog(BasicProgramID);
            if (!string.IsNullOrEmpty(programLog))
                Console.WriteLine($"Program link log:\n{programLog}");

        }

        public void Buffer_object() {
            float[] vertices = {
                // positions   // texCoords
                -1.0f,  1.0f,  0.0f, 1.0f,
                -1.0f, -1.0f,  0.0f, 0.0f,
                 1.0f, -1.0f,  1.0f, 0.0f,
                -1.0f,  1.0f,  0.0f, 1.0f,
                 1.0f, -1.0f,  1.0f, 0.0f,
                 1.0f,  1.0f,  1.0f, 1.0f
            };

            GL.GenVertexArrays(1, out vao);
            GL.GenBuffers(1, out vbo);

            GL.BindVertexArray(vao);
            GL.BindBuffer(BufferTarget.ArrayBuffer, vbo);
            GL.BufferData(BufferTarget.ArrayBuffer, (IntPtr)(vertices.Length * sizeof(float)), vertices, BufferUsageHint.StaticDraw);

            GL.EnableVertexAttribArray(0);
            GL.VertexAttribPointer(0, 2, VertexAttribPointerType.Float, false, 4 * sizeof(float), 0);

            GL.EnableVertexAttribArray(1);
            GL.VertexAttribPointer(1, 2, VertexAttribPointerType.Float, false, 4 * sizeof(float), 2 * sizeof(float));
        }


        public void Render()
        {
            GL.ClearColor(Color.Black);
            GL.Clear(ClearBufferMask.ColorBufferBit | ClearBufferMask.DepthBufferBit);

            GL.UseProgram(BasicProgramID);

            // Устанавливаем параметры материалов
            GL.Uniform3(cubeColorLoc, cubeColor);
            GL.Uniform3(tetraColorLoc, tetraColor);
            GL.Uniform1(mirrorCoefLoc, mirrorCoef);
            GL.Uniform1(transparencyLoc, transparency);
            GL.Uniform1(maxDepthLoc, maxDepth);

            // Добавляем локации для камеры
            uniform_cameraPosition = GL.GetUniformLocation(BasicProgramID, "cameraPosition");
            uniform_cameraView = GL.GetUniformLocation(BasicProgramID, "cameraView");
            uniform_cameraUp = GL.GetUniformLocation(BasicProgramID, "cameraUp");
            uniform_cameraSide = GL.GetUniformLocation(BasicProgramID, "cameraSide");
            uniform_cameraScale = GL.GetUniformLocation(BasicProgramID, "cameraScale");

            // Рисуем полноэкранный квад
            GL.BindVertexArray(vao);
            GL.DrawArrays(PrimitiveType.Triangles, 0, 6);

            var error = GL.GetError();
            if (error != ErrorCode.NoError)
                Debug.WriteLine($"Render error: {error}");
        }

        public void SetCamera(SCamera camera)
        {
            GL.UseProgram(BasicProgramID); //Make sure we are using program
            //Set each member variable to that struct

            GL.Uniform3(uniform_cameraPosition, camera.Position);
            GL.Uniform3(uniform_cameraView, camera.View);
            GL.Uniform3(uniform_cameraUp, camera.Up);
            GL.Uniform3(uniform_cameraSide, camera.Side);
            GL.Uniform2(uniform_cameraScale, camera.Scale);

        }

        public void SetCubeColor(Vector3 color) => cubeColor = color;
        public void SetTetraColor(Vector3 color) => tetraColor = color;
        public void SetMirrorCoef(float coef) => mirrorCoef = coef;
        public void SetTransparency(float trans) => transparency = trans;
        public void SetMaxDepth(int depth) => maxDepth = depth;

    }
}
