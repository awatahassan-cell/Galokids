const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

code = code.replace(
  /<\/tbody>\s*<\/table>\s*<\/div>\s*\}\)\s*\{activeTab === 'expenses'/,
  `</tbody>
          </table>
        </div>
        </div>
      )}
      
      {activeTab === 'expenses'`
);

fs.writeFileSync('src/pages/Admin.tsx', code);
