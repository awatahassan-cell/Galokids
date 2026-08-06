const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// For users tab, we added <div className="overflow-x-auto mt-4"> but didn't close it, which eats the outer div's closing tag.
// So the users tab ends with </table> </div> )}. We need </table> </div> </div> )}.
code = code.replace(
  /<\/tbody>\s*<\/table>\s*<\/div>\s*\}\)/, // wait, users table ends with </table> </div> )}
  `</tbody>
          </table>
        </div>
        </div>
      )}`
);

fs.writeFileSync('src/pages/Admin.tsx', code);
