const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// setiap ada request, maka server akan menjalankan fungsi-fungsi berikut
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// setup session
app.use(
  session({
    secret: 'my_secret_key', 
    resave: false,
    saveUninitialized: false,
  })
);

// setup database
const con = mysql.createConnection({
  //host: '127.0.0.1',
  //user: 'root',
  //password: '',
  //database: 'my_blogs'
  host: 'sql3.freemysqlhosting.net',
  user: 'sql3483735',
  password: 'n7LPBzL5Px',
  database: 'sql3483735'
})
con.connect((err) => {
  if (err) throw err;
  console.log("Connected!");
});
// store the con inside the req
app.use((req, res, next) => {
  req.con = con
  next()
})

// pengecekan session
app.use((req, res, next) => {
  if(req.session.userID == undefined){
    console.log("Akun tidak login");
    res.locals.userName = "Tamu";
    res.locals.isLoggedIn = false;
  } else {
    console.log("Akun telah login");
    res.locals.userName = req.session.userName;
    res.locals.isLoggedIn = true;
    res.locals.userID = req.session.userID;
    console.log(res.locals.userID);
  }
  next();
})

// fungsi-fungsi untuk menangani request GET
app.get('/', (req, res) => {
  con.query(
    'SELECT * FROM blogs',
    (error, results) => {
      console.log(results);
      res.render('blogs', {articles: results});
    }
  )
});

app.get('/users/signup', (req, res) => {
  res.render('signup.ejs', {errors: []});
});

app.get('/users/login', (req, res) => {
  res.render('login.ejs', {errors: []});
});

app.get('/users/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/');
  })
});

app.get('/tambah/:id', (req, res) => {
  console.log(req.params.id);
  res.render('tambah', {userID: req.params.id,});
});

app.get('/detail/:id', (req, res) => {
  console.log(req.params.id);
  con.query(
    'SELECT * FROM blogs LEFT JOIN comments ON blogs.id = comments.blog_id JOIN users ON users.id = blogs.user_id WHERE blogs.id = ?',
    [req.params.id],
    (error, results) => {
      console.log(results);
      res.render('details', {detail: results});
    }
  );
});

app.get('/comment/:id', (req, res) => {
  console.log("Berhasil tersambung !");
  console.log(req.params.id);
  
  con.query(
    'SELECT * FROM comments WHERE blog_id = ?',
    [req.params.id],
    (error, results) => {
      res.render("comments");
    }
  );
});

app.get('/about', (req, res) => {
  console.log("About this website");
  res.render("about.ejs");
})

// fungsi-fungsi untuk menangani request POST
app.post('/users/login', (req, res) => {
  const email = req.body.email;
  const errors = [];
    
  con.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      console.log(results);
      if(results.length > 0) {
        const plain = req.body.password;
        console.log("Email ditemukan !!!");
        const hash = results[0].password;
        console.log(hash);
        console.log(plain);
        bcrypt.compare(plain, hash, (error, isEqual) => {
          if(isEqual) {
            console.log("Login berhasil !!!");
            console.log(hash);
            req.session.userID = results[0].id;
            req.session.userName = results[0].username;
            console.log(req.session.userID);
            res.redirect('/');
          } else {
            errors.push("Password salah");
            res.render('login.ejs', {errors: errors});
          }
        });
      } else {
        errors.push("Email tidak terdaftar");
        res.render('login.ejs', {errors: errors});
      }
    }
  )
});

app.post('/users/signup',
  (req, res, next) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];
    if(username == ''){
      errors.push("Username kosong");
    } 
    if(email == '') {
      errors.push("Email kosong");
    } 
    if(password == '') {
      errors.push("Password kosong");
    } 
    if(errors.length > 0) {
      res.render('signup.ejs', { errors: errors }); 
    } else {
      next();
    } 
  },

  (req, res, next) => {
    const email = req.body.email;
    const errors = [];
    con.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (error, results) => {
        if(results.length > 0) {
          errors.push("Email telah terdaftar");
          console.log(errors);
          res.render('signup.ejs', {errors: errors});
        } else {
          next();
        }
      }
    )
  },

  (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    bcrypt.hash(password, 10, (error, hash) => {
      con.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (error, results) => {
          console.log(results);
          res.redirect('/');
        }
      );
    });
  }
);

app.post('/tambah/:id', (req, res) => {
  const user_id = req.params.id;
  const title = req.body.title;
  const description = req.body.description;
  const location = req.body.location;
  const image = req.body.image;
  
  console.log("Mengecek image");
  console.log(image);

  con.query(
    'INSERT INTO blogs (title, description, user_id, location) VALUES (?, ?, ?, ?)',
    [title, description, user_id, location],
    (error, results) => {
      console.log(results);
      console.log("Artikel berhasil ditambahkan !!");
      res.redirect('/');
    }
  );
});

app.post('/hapus/:id', (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.userID;
  console.log(article_id);
  console.log(user_id);

  con.query(
    'DELETE FROM blogs WHERE id = ? AND user_id = ?',
    [article_id, user_id],
    (error, results) => {
      console.log("Artikel berhasil dihapus !!");
      res.redirect('/');
    }
  );
});

app.post('/new-comment/:id', (req, res) => {
  const user_id = req.session.userID;
  const blog_id = req.params.id;
  const comment = req.body.newComment;

  console.log(user_id);
  console.log(blog_id);
  console.log(comment);
  
  con.query(
    'INSERT INTO comments (comment, blog_id, user_id) VALUES (?, ?, ?)',
    [comment, blog_id, user_id],
    (error, results) => {
      console.log(results);
      console.log("Komentar berhasil ditambahkan !!");
      res.redirect('/');
    }
  );
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// menyalakan server
app.set('port', 3000);
app.listen(app.get('port'));

module.exports = app;