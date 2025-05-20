using OpenTK;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using OpenTK.Graphics.OpenGL;
using static lab3_comp_graphics.View;
using System.Security.Policy;

namespace lab3_comp_graphics
{
    public partial class Form1 : Form
    {

        private View m;
        private View r;
        private View z;
        public bool button1 = false;
        public bool button2 = false;
        public bool button3 = false;

        bool isInitialized = false; // Флаг для инициализации
        public struct SCamera
        {
            public Vector3 Position;
            public Vector3 View;
            public Vector3 Up;
            public Vector3 Side;
            public Vector2 Scale;
        }

            
        public Form1()
        {
            InitializeComponent();
            m = new View();
            r = new View();
            z = new View();
            //radioButton1.Checked = true;
            //button1 = true;
            glControl1.Dock = DockStyle.Fill;
            glControl1.Load += glControl1_Load;
            glControl1.Paint += glControl1_Paint;
            glControl1.Resize += glControl1_Resize;
            radioButton1.CheckedChanged += radioButton1_CheckedChanged;
            radioButton2.CheckedChanged += radioButton2_CheckedChanged;
            radioButton3.CheckedChanged += radioButton3_CheckedChanged;
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            
        }


        private void glControl1_Load(object sender, EventArgs e)
        {
            glControl1.MakeCurrent();
            GL.Enable(EnableCap.DepthTest);
            m.InitShaders(button1, button2, button3);
            m.Buffer_object();
            isInitialized = true; // Устанавливаем флаг
        }

        private void glControl1_Paint(object sender, PaintEventArgs e)
        {
            if (isInitialized)
            {
                SCamera myCamera = new SCamera
                {
                    Position = new Vector3(0.0f, 0.0f, -5.0f),
                    View = new Vector3(0.0f, 0.0f, 1.0f),
                    Up = new Vector3(0.0f, 1.0f, 0.0f),
                    Side = new Vector3(1.0f, 0.0f, 0.0f),
                    Scale = new Vector2(1.0f, (float)glControl1.Height / glControl1.Width)
                };
                if (button1 == true) {
                    m.SetCamera(myCamera); // Pass the camera struct to the render method in View
                    m.Render();
                }
                if (button2 == true)
                {
                    r.SetCamera(myCamera); // Pass the camera struct to the render method in View
                    r.Render();
                }
                if (button3 == true)
                {
                    z.SetCamera(myCamera); // Pass the camera struct to the render method in View
                    z.Render();
                }
                // Создаем экземпляр SCamera
                glControl1.SwapBuffers(); // Отображаем результат

            }
        }

        private void glControl1_Resize(object sender, EventArgs e)
        {
            glControl1.MakeCurrent();
            GL.Viewport(0, 0, glControl1.Width, glControl1.Height);
            glControl1.Invalidate();
        }

        private void radioButton1_CheckedChanged(object sender, EventArgs e)
        {
            if (radioButton1.Checked) 
            {
                button1 = true;
                button2 = false;
                button3 = false;
                glControl1.MakeCurrent();
                GL.Enable(EnableCap.DepthTest);
                m.InitShaders(button1, button2, button3);
                m.Buffer_object();
                glControl1.Invalidate();
            }
        }

        private void radioButton2_CheckedChanged(object sender, EventArgs e)
        {
            if (radioButton2.Checked) 
            {
                button1 = false;
                button2 = true;
                button3 = false;
                glControl1.MakeCurrent();
                GL.Enable(EnableCap.DepthTest);
                r.InitShaders(button1, button2, button3);
                r.Buffer_object();
                glControl1.Invalidate();
            }
        }

        private void radioButton3_CheckedChanged(object sender, EventArgs e)
        {
            if (radioButton3.Checked) 
            {
                button1 = false;
                button2 = false;
                button3 = true;
                glControl1.MakeCurrent();
                GL.Enable(EnableCap.DepthTest);
                z.InitShaders(button1, button2, button3);
                z.Buffer_object();
                glControl1.Invalidate();
            }
        }
    }
}
