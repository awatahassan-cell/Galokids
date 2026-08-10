const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users'`;

const replacement = `            </tbody>
          </table>
          <Pagination meta={ordersPagination} onPageChange={(page) => refreshOrders(page, 10)} />
        </div>
      )}

      {activeTab === 'users'`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('done orders');
