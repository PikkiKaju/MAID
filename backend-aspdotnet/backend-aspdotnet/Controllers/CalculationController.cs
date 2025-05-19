using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CalculationController : ControllerBase
    {

        [HttpPost("results")]
        public IActionResult ReceiveResults([FromBody] LoginDto result)
        {
            // recuve python results
            return Ok();
        }

    }
}
