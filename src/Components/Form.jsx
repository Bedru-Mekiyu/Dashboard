import { useState } from 'react'
   export  function Form(){
      const [showPassword,setShowPassword]=useState(true);
        function toggleVisibility(){
          setShowPassword(prev=>!prev)
        }
       return(
           <div className="container-div">
           <p>Hello, welcome to my website</p>
           <input type="email" placeholder="Email" className="input-form"/>
           <input type={showPassword?"password":"text"} placeholder="Password" className="input-password">
             
           </input>
           <button onClick={toggleVisibility}>show/hide</button>
           <button className="login-button form-button">Login</button>
           <button className="form-button">Sign up</button>


           </div>
       );
     }
