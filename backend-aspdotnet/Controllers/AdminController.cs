using backend_aspdotnet.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly ElementDBConterxt _db;

        public AdminController(ElementDBConterxt db)
        {
            _db = db;
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("login")]
        public void IDK()
        {

        }



        // get unchecked elements
        // set checked
        // remove 


    }
}
